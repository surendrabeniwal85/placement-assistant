package com.placementassistant.backend.placement.drives.criteria;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/drives/{driveId}/criteria")
public class CriteriaController {

        private final CriteriaService service;

        public CriteriaController(CriteriaService service) {
                this.service = service;
        }

        @GetMapping
        public CriteriaResponse get(@PathVariable Long driveId) {
                return service.get(driveId);
        }

        @PutMapping
        @PreAuthorize("hasAnyRole('TPO', 'D_TPO')")
        public CriteriaResponse save(@PathVariable Long driveId, @Valid @RequestBody CriteriaRequest request) {
                return service.save(driveId, request);
        }
}
