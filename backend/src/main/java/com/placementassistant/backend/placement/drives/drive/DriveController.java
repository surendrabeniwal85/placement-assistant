package com.placementassistant.backend.placement.drives.drive;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
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
@RequestMapping("/api/v1/drives")
public class DriveController {

        private final DriveService service;

        public DriveController(DriveService service) {
                this.service = service;
        }

        @GetMapping
        public Page<DriveResponse> list(@RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "20") int size) {
                return service.list(paging(page, size));
        }

        @GetMapping("/upcoming")
        public Page<DriveResponse> upcoming(@RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "20") int size) {
                return service.upcoming(paging(page, size));
        }

        @GetMapping("/calendar")
        public List<DriveResponse> calendar(
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
                return service.calendar(from, to);
        }

        @GetMapping("/{id}")
        public DriveResponse get(@PathVariable Long id) {
                return service.get(id);
        }

        @PostMapping
        @PreAuthorize("hasAnyRole('TPO', 'D_TPO')")
        @ResponseStatus(HttpStatus.CREATED)
        public DriveResponse create(@Valid @RequestBody DriveRequest request) {
                return service.create(request);
        }

        @PutMapping("/{id}")
        @PreAuthorize("hasAnyRole('TPO', 'D_TPO')")
        public DriveResponse update(@PathVariable Long id, @Valid @RequestBody DriveRequest request) {
                return service.update(id, request);
        }

        private PageRequest paging(int page, int size) {
                return PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        }
}
