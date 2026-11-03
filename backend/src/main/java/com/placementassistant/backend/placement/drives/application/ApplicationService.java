package com.placementassistant.backend.placement.drives.application;

import com.placementassistant.backend.institute.records.entity.StudentProfile;
import com.placementassistant.backend.institute.records.service.StudentQueryService;
import com.placementassistant.backend.placement.drives.PlacementConflictException;
import com.placementassistant.backend.placement.drives.PlacementNotFoundException;
import com.placementassistant.backend.placement.drives.drive.Drive;
import com.placementassistant.backend.placement.drives.drive.DriveRepository;
import com.placementassistant.backend.placement.drives.drive.DriveStatus;
import com.placementassistant.backend.placement.drives.eligibility.EligibilityResult;
import com.placementassistant.backend.placement.drives.eligibility.OfferPathService;
import com.placementassistant.backend.placement.drives.eligibility.RuleResult;
import com.placementassistant.backend.placement.drives.eligibility.RuleStatus;
import java.time.LocalDateTime;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApplicationService {

        private static final int SNAPSHOT_LIMIT = 2000;

        private final ApplicationRepository applications;
        private final DriveRepository drives;
        private final StudentQueryService students;
        private final OfferPathService eligibility;

        public ApplicationService(ApplicationRepository applications, DriveRepository drives,
                        StudentQueryService students, OfferPathService eligibility) {
                this.applications = applications;
                this.drives = drives;
                this.students = students;
                this.eligibility = eligibility;
        }

        @Transactional
        public ApplicationResponse apply(Long driveId, String email) {
                Drive drive = find(driveId);
                if (drive.getStatus() != DriveStatus.OPEN) {
                        throw new PlacementConflictException("This drive is not open for applications.");
                }
                if (LocalDateTime.now().isAfter(drive.getDeadline())) {
                        throw new PlacementConflictException("The application deadline has passed.");
                }
                Long studentId = studentId(email);
                DriveApplication existing = applications
                                .findByDriveIdAndStudentIdAndDeletedFalse(driveId, studentId).orElse(null);
                if (existing != null && existing.getStatus() == ApplicationStatus.APPLIED) {
                        throw new PlacementConflictException("You have already applied to this drive.");
                }
                EligibilityResult result = eligibility.explainDriveEligibility(driveId, email);
                if (!result.eligible()) {
                        throw new PlacementConflictException("You are not eligible for this drive. " + reasons(result));
                }
                DriveApplication application = existing != null ? existing : new DriveApplication(driveId, studentId);
                application.markApplied(LocalDateTime.now(), snapshot(result));
                return ApplicationResponse.from(applications.save(application));
        }

        @Transactional
        public ApplicationResponse withdraw(Long driveId, String email) {
                Drive drive = find(driveId);
                if (LocalDateTime.now().isAfter(drive.getDeadline())) {
                        throw new PlacementConflictException("The deadline has passed, so you can no longer withdraw.");
                }
                DriveApplication application = applications
                                .findByDriveIdAndStudentIdAndDeletedFalse(driveId, studentId(email))
                                .orElseThrow(() -> new PlacementNotFoundException("You have not applied to this drive."));
                if (application.getStatus() != ApplicationStatus.APPLIED) {
                        throw new PlacementConflictException("Your application is already withdrawn.");
                }
                application.markWithdrawn();
                return ApplicationResponse.from(application);
        }

        @Transactional(readOnly = true)
        public ApplicationResponse mine(Long driveId, String email) {
                find(driveId);
                return applications.findByDriveIdAndStudentIdAndDeletedFalse(driveId, studentId(email))
                                .map(ApplicationResponse::from)
                                .orElse(ApplicationResponse.none(driveId));
        }

        private Drive find(Long driveId) {
                return drives.findByIdAndDeletedFalse(driveId)
                                .orElseThrow(() -> new PlacementNotFoundException("Drive not found."));
        }

        private Long studentId(String email) {
                return students.findByEmail(email)
                                .map(StudentProfile::getId)
                                .orElseThrow(() -> new PlacementNotFoundException("No student profile found for this account."));
        }

        private static String reasons(EligibilityResult result) {
                return result.rules().stream()
                                .filter(r -> r.status() == RuleStatus.FAIL)
                                .map(RuleResult::nextAction)
                                .collect(Collectors.joining(" "));
        }

        private static String snapshot(EligibilityResult result) {
                String text = result.rules().stream()
                                .map(r -> r.status() + " " + r.rule() + ": " + r.actual() + " (needs " + r.expected() + ")")
                                .collect(Collectors.joining("; "));
                return text.length() > SNAPSHOT_LIMIT ? text.substring(0, SNAPSHOT_LIMIT) : text;
        }
}
