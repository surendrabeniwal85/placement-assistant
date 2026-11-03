package com.placementassistant.backend.placement.drives.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

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
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ApplicationServiceTest {

        private static final String EMAIL = "student@institute.ac.in";

        private ApplicationRepository applications;
        private OfferPathService eligibility;
        private Drive drive;
        private ApplicationService service;

        @BeforeEach
        void setUp() {
                applications = mock(ApplicationRepository.class);
                DriveRepository drives = mock(DriveRepository.class);
                StudentQueryService students = mock(StudentQueryService.class);
                eligibility = mock(OfferPathService.class);
                drive = mock(Drive.class);
                StudentProfile profile = mock(StudentProfile.class);

                when(profile.getId()).thenReturn(7L);
                when(students.findByEmail(EMAIL)).thenReturn(Optional.of(profile));
                when(drives.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(drive));
                when(drive.getStatus()).thenReturn(DriveStatus.OPEN);
                when(drive.getDeadline()).thenReturn(LocalDateTime.now().plusDays(2));
                when(applications.findByDriveIdAndStudentIdAndDeletedFalse(1L, 7L)).thenReturn(Optional.empty());
                when(applications.save(any(DriveApplication.class))).thenAnswer(i -> i.getArgument(0));
                service = new ApplicationService(applications, drives, students, eligibility);
        }

        private static EligibilityResult result(boolean eligible) {
                RuleResult rule = eligible
                                ? new RuleResult("Minimum CGPA", ">= 7", "8.5", RuleStatus.PASS, "")
                                : new RuleResult("Minimum CGPA", ">= 8.8", "8.52", RuleStatus.FAIL,
                                                "Your CGPA is 8.52, you need at least 8.8.");
                return new EligibilityResult(1L, eligible, false, List.of(rule));
        }

        @Test
        void eligibleStudentCanApply() {
                when(eligibility.explainDriveEligibility(1L, EMAIL)).thenReturn(result(true));
                ApplicationResponse response = service.apply(1L, EMAIL);
                assertEquals("APPLIED", response.status());
                assertNotNull(response.appliedAt());
        }

        @Test
        void ineligibleStudentIsRefusedWithTheReason() {
                when(eligibility.explainDriveEligibility(1L, EMAIL)).thenReturn(result(false));
                PlacementConflictException error = assertThrows(PlacementConflictException.class,
                                () -> service.apply(1L, EMAIL));
                assertTrue(error.getMessage().contains("8.8"));
        }

        @Test
        void applyingTwiceIsRefused() {
                DriveApplication existing = new DriveApplication(1L, 7L);
                existing.markApplied(LocalDateTime.now(), "x");
                when(applications.findByDriveIdAndStudentIdAndDeletedFalse(1L, 7L)).thenReturn(Optional.of(existing));
                assertThrows(PlacementConflictException.class, () -> service.apply(1L, EMAIL));
        }

        @Test
        void closedDriveIsRefused() {
                when(drive.getStatus()).thenReturn(DriveStatus.CLOSED);
                assertThrows(PlacementConflictException.class, () -> service.apply(1L, EMAIL));
        }

        @Test
        void afterTheDeadlineIsRefused() {
                when(drive.getDeadline()).thenReturn(LocalDateTime.now().minusMinutes(1));
                assertThrows(PlacementConflictException.class, () -> service.apply(1L, EMAIL));
        }

        @Test
        void withdrawingWithoutApplyingIsNotFound() {
                assertThrows(PlacementNotFoundException.class, () -> service.withdraw(1L, EMAIL));
        }

        @Test
        void withdrawnStudentCanApplyAgain() {
                DriveApplication existing = new DriveApplication(1L, 7L);
                existing.markApplied(LocalDateTime.now(), "x");
                existing.markWithdrawn();
                when(applications.findByDriveIdAndStudentIdAndDeletedFalse(1L, 7L)).thenReturn(Optional.of(existing));
                when(eligibility.explainDriveEligibility(1L, EMAIL)).thenReturn(result(true));
                assertEquals("APPLIED", service.apply(1L, EMAIL).status());
        }
}
