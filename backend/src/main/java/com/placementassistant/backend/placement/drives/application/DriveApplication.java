package com.placementassistant.backend.placement.drives.application;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "drive_application")
public class DriveApplication {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @Column(name = "drive_id", nullable = false)
        private Long driveId;

        @Column(name = "student_id", nullable = false)
        private Long studentId;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", nullable = false)
        private ApplicationStatus status = ApplicationStatus.APPLIED;

        @Column(name = "applied_at", nullable = false)
        private LocalDateTime appliedAt;

        @Column(name = "eligibility_snapshot", length = 2000)
        private String eligibilitySnapshot;

        @Column(name = "deleted", nullable = false)
        private boolean deleted;

        protected DriveApplication() {
        }

        public DriveApplication(Long driveId, Long studentId) {
                this.driveId = driveId;
                this.studentId = studentId;
        }

        public void markApplied(LocalDateTime at, String snapshot) {
                this.status = ApplicationStatus.APPLIED;
                this.appliedAt = at;
                this.eligibilitySnapshot = snapshot;
        }

        public void markWithdrawn() {
                this.status = ApplicationStatus.WITHDRAWN;
        }

        public Long getId() { return id; }
        public Long getDriveId() { return driveId; }
        public Long getStudentId() { return studentId; }
        public ApplicationStatus getStatus() { return status; }
        public LocalDateTime getAppliedAt() { return appliedAt; }
        public String getEligibilitySnapshot() { return eligibilitySnapshot; }
        public boolean isDeleted() { return deleted; }
}
