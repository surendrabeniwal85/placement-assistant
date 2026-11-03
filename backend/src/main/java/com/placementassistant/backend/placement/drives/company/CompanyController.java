package com.placementassistant.backend.placement.drives.company;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/companies")
public class CompanyController {

        private final CompanyService service;

        public CompanyController(CompanyService service) {
                this.service = service;
        }

        @GetMapping
        public Page<CompanyResponse> list(@RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "20") int size) {
                return service.list(PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
        }

        @GetMapping("/{id}")
        public CompanyResponse get(@PathVariable Long id) {
                return service.get(id);
        }

        @PostMapping
        @PreAuthorize("hasAnyRole('TPO', 'D_TPO')")
        @ResponseStatus(HttpStatus.CREATED)
        public CompanyResponse create(@Valid @RequestBody CompanyRequest request) {
                return service.create(request);
        }

        @PutMapping("/{id}")
        @PreAuthorize("hasAnyRole('TPO', 'D_TPO')")
        public CompanyResponse update(@PathVariable Long id, @Valid @RequestBody CompanyRequest request) {
                return service.update(id, request);
        }
}
