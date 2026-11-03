package com.placementassistant.backend.placement.drives.opportunity;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.placementassistant.backend.institute.records.service.StudentQueryService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

class OpportunityAudienceTest {

        private final StudentQueryService students = mock(StudentQueryService.class);
        private final OpportunityAudience audience = new OpportunityAudience(students);

        private static Authentication user(String email, String role) {
                return new UsernamePasswordAuthenticationToken(email, "n/a", List.of(new SimpleGrantedAuthority(role)));
        }

        @Test
        void finalYearStudentSeesFinalYearOnlyJobs() {
                when(students.isFinalYear("final@institute.ac.in")).thenReturn(true);
                assertTrue(audience.canSeeFinalYearOnly(user("final@institute.ac.in", "ROLE_STUDENT")));
        }

        @Test
        void otherStudentsDoNot() {
                when(students.isFinalYear("junior@institute.ac.in")).thenReturn(false);
                assertFalse(audience.canSeeFinalYearOnly(user("junior@institute.ac.in", "ROLE_STUDENT")));
        }

        @Test
        void unknownStudentDoesNot() {
                assertFalse(audience.canSeeFinalYearOnly(user("nobody@institute.ac.in", "ROLE_STUDENT")));
        }

        @Test
        void placementStaffSeeEverything() {
                assertTrue(audience.canSeeFinalYearOnly(user("tpo@placement.ac.in", "ROLE_TPO")));
        }

        @Test
        void noLoginSeesNothingExtra() {
                assertFalse(audience.canSeeFinalYearOnly(null));
        }
}
