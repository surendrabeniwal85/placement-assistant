package com.placementassistant.backend.placement.drives.application;

import java.time.LocalDateTime;

public record ApplicationResponse(Long driveId, String status, LocalDateTime appliedAt) {

        static ApplicationResponse from(DriveApplication a) {
                return new ApplicationResponse(a.getDriveId(), a.getStatus().name(), a.getAppliedAt());
        }

        static ApplicationResponse none(Long driveId) {
                return new ApplicationResponse(driveId, "NOT_APPLIED", null);
        }
}
