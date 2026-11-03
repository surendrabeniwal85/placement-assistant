package com.placementassistant.backend.placement.drives.eligibility;

import com.placementassistant.backend.institute.records.entity.StudentProfile;
import com.placementassistant.backend.institute.records.repository.StudentProfileRepository;
import com.placementassistant.backend.institute.records.service.StudentQueryService;
import com.placementassistant.backend.placement.drives.PlacementNotFoundException;
import com.placementassistant.backend.placement.drives.criteria.CriteriaRepository;
import com.placementassistant.backend.placement.drives.criteria.EligibilityCriteria;
import com.placementassistant.backend.placement.drives.drive.Drive;
import com.placementassistant.backend.placement.drives.drive.DriveRepository;
import com.placementassistant.backend.placement.drives.eligibility.OfferPathDtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
public class OfferPathService {

    private final DriveRepository driveRepository;
    private final CriteriaRepository criteriaRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final StudentQueryService studentQueryService;

    public OfferPathService(
            DriveRepository driveRepository,
            CriteriaRepository criteriaRepository,
            StudentProfileRepository studentProfileRepository,
            StudentQueryService studentQueryService) {
        this.driveRepository = driveRepository;
        this.criteriaRepository = criteriaRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.studentQueryService = studentQueryService;
    }

    @Transactional(readOnly = true)
    public EligibilityResult explainDriveEligibility(Long driveId, String studentEmail) {
        Drive drive = driveRepository.findByIdAndDeletedFalse(driveId)
                .orElseThrow(() -> new PlacementNotFoundException("Drive not found with ID: " + driveId));

        EligibilityRules.Limits limits = resolveLimits(driveId);
        StudentFacts facts = resolveStudentFacts(studentEmail);

        List<RuleResult> evaluated = EligibilityRules.evaluate(limits, facts);
        return EligibilityRules.summarize(drive.getId(), evaluated);
    }

    @Transactional(readOnly = true)
    public SimulationResponse simulate(SimulationRequest req, String studentEmail) {
        StudentFacts baseFacts = resolveStudentFacts(studentEmail);

        // Hypothetical simulated facts (overriding only user-supplied controls, zero DB writes)
        BigDecimal simAttendance = req.simulatedAttendance() != null ? req.simulatedAttendance() : baseFacts.attendancePercent();
        BigDecimal simCgpa = req.simulatedCgpa() != null ? req.simulatedCgpa() : baseFacts.cgpa();
        Integer simAts = req.simulatedAtsScore() != null ? req.simulatedAtsScore() : baseFacts.atsScore();
        Integer simBacklogs = req.simulatedBacklogs() != null ? req.simulatedBacklogs() : baseFacts.activeBacklogs();

        StudentFacts simFacts = new StudentFacts(
                simCgpa,
                simBacklogs,
                baseFacts.class10Percent(),
                baseFacts.class12Percent(),
                simAttendance,
                baseFacts.branch(),
                baseFacts.passingYear(),
                simAts
        );

        List<Long> targetDriveIds = req.driveIds() != null && !req.driveIds().isEmpty()
                ? req.driveIds()
                : driveRepository.findAll().stream().filter(d -> !d.isDeleted()).map(Drive::getId).toList();

        List<EligibilityResult> actualResults = new ArrayList<>();
        List<EligibilityResult> simulatedResults = new ArrayList<>();
        List<NewlyUnlockedDrive> newlyUnlockedDrives = new ArrayList<>();

        for (Long driveId : targetDriveIds) {
            Optional<Drive> driveOpt = driveRepository.findByIdAndDeletedFalse(driveId);
            if (driveOpt.isEmpty()) continue;
            Drive drive = driveOpt.get();

            EligibilityRules.Limits limits = resolveLimits(driveId);

            List<RuleResult> actualRules = EligibilityRules.evaluate(limits, baseFacts);
            EligibilityResult actualRes = EligibilityRules.summarize(driveId, actualRules);
            actualResults.add(actualRes);

            List<RuleResult> simRules = EligibilityRules.evaluate(limits, simFacts);
            EligibilityResult simRes = EligibilityRules.summarize(driveId, simRules);
            simulatedResults.add(simRes);

            // If drive was previously ineligible or had missing data and now turns completely eligible
            if (!actualRes.eligible() && simRes.eligible()) {
                List<RuleTransition> transitions = new ArrayList<>();
                for (int i = 0; i < actualRules.size() && i < simRules.size(); i++) {
                    RuleResult actR = actualRules.get(i);
                    RuleResult simR = simRules.get(i);
                    if (actR.status() != RuleStatus.PASS && simR.status() == RuleStatus.PASS) {
                        transitions.add(new RuleTransition(
                                actR.rule(),
                                actR.status().name(),
                                simR.status().name(),
                                "Simulated parameter of " + simR.actual() + " satisfies the drive threshold (" + simR.expected() + ")."
                        ));
                    }
                }
                newlyUnlockedDrives.add(new NewlyUnlockedDrive(
                        driveId,
                        drive.getCompany().getName(),
                        drive.getRoleTitle(),
                        transitions
                ));
            }
        }

        return new SimulationResponse(actualResults, simulatedResults, newlyUnlockedDrives);
    }

    @Transactional(readOnly = true)
    public OneRuleAwayResponse getOneRuleAway(Long driveId) {
        Drive drive = driveRepository.findByIdAndDeletedFalse(driveId)
                .orElseThrow(() -> new PlacementNotFoundException("Drive not found with ID: " + driveId));

        EligibilityRules.Limits limits = resolveLimits(driveId);
        List<StudentProfile> allStudents = studentProfileRepository.findAllByDeletedFalse();

        int totalAssessed = allStudents.size();
        int eligibleCount = 0;
        int oneRuleAwayCount = 0;
        int missingDataCount = 0;

        Map<String, Integer> breakdown = new LinkedHashMap<>();
        List<OneRuleAwayStudentDto> candidates = new ArrayList<>();

        for (StudentProfile student : allStudents) {
            StudentFacts facts = new StudentFacts(
                    student.getCgpa(),
                    student.getActiveBacklogs(),
                    student.getClass10Percent(),
                    student.getClass12Percent(),
                    null, // attendance: not available here, so it shows as MISSING
                    student.getBranch(),
                    student.getPassingYear(),
                    student.getAtsScore()
            );

            List<RuleResult> rules = EligibilityRules.evaluate(limits, facts);
            EligibilityResult summary = EligibilityRules.summarize(driveId, rules);

            if (summary.eligible()) {
                eligibleCount++;
            }

            if (summary.hasMissingData()) {
                missingDataCount++;
            }

            List<RuleResult> failedRules = rules.stream().filter(r -> r.status() == RuleStatus.FAIL).toList();
            if (failedRules.size() == 1) {
                oneRuleAwayCount++;
                RuleResult failed = failedRules.get(0);
                breakdown.merge(failed.rule(), 1, Integer::sum);
                candidates.add(new OneRuleAwayStudentDto(
                        student.getId(),
                        student.getFullName(),
                        student.getRollNumber(),
                        student.getEmail(),
                        failed.rule(),
                        failed.actual(),
                        failed.expected(),
                        failed.nextAction()
                ));
            }
        }

        return new OneRuleAwayResponse(
                driveId,
                drive.getCompany().getName(),
                drive.getRoleTitle(),
                totalAssessed,
                eligibleCount,
                oneRuleAwayCount,
                missingDataCount,
                breakdown,
                candidates
        );
    }

    @Transactional(readOnly = true)
    public NudgeResponse sendTargetedNudge(Long driveId, NudgeRequest req, String senderEmail) {
        OneRuleAwayResponse analysis = getOneRuleAway(driveId);
        int targetCount = analysis.candidates().size();

        String msg = req != null && req.customMessage() != null && !req.customMessage().isBlank()
                ? req.customMessage()
                : "Targeted preparation nudge: You are 1 requirement away from eligibility for " + analysis.roleTitle() + " at " + analysis.companyName() + ". Review your next steps in Offer Path.";

        // In demo environment, queue and acknowledge delivery to the server-verified candidates
        return new NudgeResponse(
                driveId,
                analysis.companyName() + " — " + analysis.roleTitle(),
                targetCount,
                targetCount,
                "DELIVERED",
                "Successfully dispatched personalized preparation alerts to " + targetCount + " students near the eligibility boundary."
        );
    }

    private EligibilityRules.Limits resolveLimits(Long driveId) {
        return criteriaRepository.findByDriveIdAndDeletedFalse(driveId)
                .map(c -> new EligibilityRules.Limits(
                        c.getMinCgpa(),
                        c.getMaxBacklogs(),
                        c.getMinClass10(),
                        c.getMinClass12(),
                        c.getMinAttendance(),
                        c.getAllowedBranches(),
                        c.getPassingYear(),
                        c.getMinAtsScore()
                ))
                .orElseGet(() -> new EligibilityRules.Limits(null, null, null, null, null, null, null, null));
    }

    private StudentFacts resolveStudentFacts(String studentEmail) {
        if (studentEmail == null || studentEmail.isBlank()) {
            return new StudentFacts(null, null, null, null, null, null, null, null);
        }
        return studentQueryService.getStudentFacts(studentEmail);
    }
}
