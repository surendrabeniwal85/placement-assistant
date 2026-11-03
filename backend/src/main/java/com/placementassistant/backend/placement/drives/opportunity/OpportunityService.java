package com.placementassistant.backend.placement.drives.opportunity;

import com.placementassistant.backend.placement.drives.PlacementConflictException;
import com.placementassistant.backend.placement.drives.PlacementNotFoundException;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OpportunityService {

        private final OpportunityRepository repository;

        public OpportunityService(OpportunityRepository repository) {
                this.repository = repository;
        }

        @Transactional(readOnly = true)
        public Page<OpportunityResponse> upcoming(OpportunityType type, boolean seeAll, Pageable pageable) {
                LocalDateTime now = LocalDateTime.now();
                Page<Opportunity> page = type == null
                                ? repository.findUpcoming(now, seeAll, pageable)
                                : repository.findUpcomingByType(type, now, seeAll, pageable);
                return page.map(OpportunityResponse::from);
        }

        @Transactional(readOnly = true)
        public OpportunityResponse get(Long id, boolean seeAll) {
                Opportunity found = find(id);
                if (found.isFinalYearOnly() && !seeAll) {
                        throw new PlacementNotFoundException("Opportunity not found.");
                }
                return OpportunityResponse.from(found);
        }

        @Transactional
        public OpportunityResponse create(OpportunityRequest request) {
                check(request);
                return OpportunityResponse.from(repository.save(Opportunity.create(request)));
        }

        @Transactional
        public OpportunityResponse update(Long id, OpportunityRequest request) {
                check(request);
                Opportunity o = find(id);
                o.apply(request);
                return OpportunityResponse.from(o);
        }

        private void check(OpportunityRequest r) {
                if (r.startDate() != null && r.endDate() != null && r.endDate().isBefore(r.startDate())) {
                        throw new PlacementConflictException("The end date must not be before the start date.");
                }
        }

        private Opportunity find(Long id) {
                return repository.findByIdAndDeletedFalse(id)
                                .orElseThrow(() -> new PlacementNotFoundException("Opportunity not found."));
        }
}
