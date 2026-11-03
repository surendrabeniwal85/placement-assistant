package com.placementassistant.backend.placement.drives.opportunity;

import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OpportunityRepository extends JpaRepository<Opportunity, Long> {

        Optional<Opportunity> findByIdAndDeletedFalse(Long id);

        @Query("select o from Opportunity o where o.deleted = false "
                        + "and (o.deadline is null or o.deadline >= :now) "
                        + "and (:seeAll = true or o.finalYearOnly = false) order by o.deadline asc")
        Page<Opportunity> findUpcoming(@Param("now") LocalDateTime now, @Param("seeAll") boolean seeAll, Pageable pageable);

        @Query("select o from Opportunity o where o.deleted = false and o.type = :type "
                        + "and (o.deadline is null or o.deadline >= :now) "
                        + "and (:seeAll = true or o.finalYearOnly = false) order by o.deadline asc")
        Page<Opportunity> findUpcomingByType(@Param("type") OpportunityType type,
                        @Param("now") LocalDateTime now, @Param("seeAll") boolean seeAll, Pageable pageable);
}
