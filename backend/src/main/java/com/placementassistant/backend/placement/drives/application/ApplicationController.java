package com.placementassistant.backend.placement.drives.application;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/drives/{driveId}/applications")
public class ApplicationController {

        private final ApplicationService service;

        public ApplicationController(ApplicationService service) {
                this.service = service;
        }

        @PostMapping
        @ResponseStatus(HttpStatus.CREATED)
        @PreAuthorize("hasRole('STUDENT')")
        public ApplicationResponse apply(@PathVariable Long driveId, Authentication authentication) {
                return service.apply(driveId, authentication.getName());
        }

        @DeleteMapping
        @PreAuthorize("hasRole('STUDENT')")
        public ApplicationResponse withdraw(@PathVariable Long driveId, Authentication authentication) {
                return service.withdraw(driveId, authentication.getName());
        }

        @GetMapping("/me")
        @PreAuthorize("hasRole('STUDENT')")
        public ApplicationResponse mine(@PathVariable Long driveId, Authentication authentication) {
                return service.mine(driveId, authentication.getName());
        }
}
