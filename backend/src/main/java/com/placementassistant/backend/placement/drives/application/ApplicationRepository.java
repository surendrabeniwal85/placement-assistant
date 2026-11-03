package com.placementassistant.backend.placement.drives.application;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationRepository extends JpaRepository<DriveApplication, Long> {

        Optional<DriveApplication> findByDriveIdAndStudentIdAndDeletedFalse(Long driveId, Long studentId);
}
