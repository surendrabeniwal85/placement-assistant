package com.placementassistant.backend.placement.drives;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.placementassistant.backend.placement.drives.company.CompanyController;
import com.placementassistant.backend.placement.drives.criteria.CriteriaController;
import com.placementassistant.backend.placement.drives.drive.DriveController;
import com.placementassistant.backend.placement.drives.opportunity.OpportunityController;
import com.placementassistant.backend.placement.drives.talk.TalkController;
import java.lang.reflect.Method;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;

class WriteEndpointsAreGuardedTest {

        @Test
        void everyWriteEndpointRequiresAPlacementRole() {
                List<Class<?>> controllers = List.of(CompanyController.class, DriveController.class,
                                CriteriaController.class, TalkController.class, OpportunityController.class);
                for (Class<?> controller : controllers) {
                        for (Method method : controller.getDeclaredMethods()) {
                                boolean writes = method.isAnnotationPresent(PostMapping.class)
                                                || method.isAnnotationPresent(PutMapping.class)
                                                || method.isAnnotationPresent(DeleteMapping.class);
                                if (writes) {
                                        assertTrue(method.isAnnotationPresent(PreAuthorize.class),
                                                        controller.getSimpleName() + "." + method.getName()
                                                                        + " must have @PreAuthorize");
                                }
                        }
                }
        }
}
