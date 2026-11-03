package com.placementassistant.backend.placement.drives.opportunity;

import com.placementassistant.backend.institute.records.service.StudentQueryService;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/** Decides whether the caller may see final-year-only opportunities (such as off-campus jobs). */
@Component
public class OpportunityAudience {

        private static final String STUDENT_ROLE = "ROLE_STUDENT";

        private final StudentQueryService students;

        public OpportunityAudience(StudentQueryService students) {
                this.students = students;
        }

        public boolean canSeeFinalYearOnly(Authentication authentication) {
                if (authentication == null) {
                        return false;
                }
                boolean isStudent = authentication.getAuthorities().stream()
                                .anyMatch(a -> STUDENT_ROLE.equals(a.getAuthority()));
                return !isStudent || students.isFinalYear(authentication.getName());
        }
}
