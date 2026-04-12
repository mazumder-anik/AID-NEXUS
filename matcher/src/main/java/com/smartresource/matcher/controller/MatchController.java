package com.smartresource.matcher.controller;

import com.smartresource.matcher.model.MatchRequest;
import com.smartresource.matcher.model.MatchResponse;
import com.smartresource.matcher.model.MatchResult;
import com.smartresource.matcher.service.MatchingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class MatchController {

    private static final Logger log = LoggerFactory.getLogger(MatchController.class);

    @Autowired
    private MatchingService matchingService;

    /**
     * POST /api/match
     * Accepts a payload of needs and volunteers, returns ranked matches.
     */
    @PostMapping("/match")
    public ResponseEntity<MatchResponse> match(@RequestBody MatchRequest request) {
        int needCount = request.getNeeds() != null ? request.getNeeds().size() : 0;
        int volCount  = request.getVolunteers() != null ? request.getVolunteers().size() : 0;

        log.info("Matching {} needs against {} volunteers", needCount, volCount);

        List<MatchResult> matches = matchingService.match(
                request.getNeeds(),
                request.getVolunteers()
        );

        log.info("Found {} candidate matches", matches.size());

        return ResponseEntity.ok(new MatchResponse(matches, needCount, volCount));
    }

    /**
     * GET /api/info — service metadata
     */
    @GetMapping("/info")
    public Map<String, Object> info() {
        return Map.of(
            "service",     "Smart Resource Matcher",
            "version",     "1.0.0",
            "algorithm",   "Skill Overlap (60%) + Haversine Proximity (40%)",
            "maxDistanceKm", 100
        );
    }
}
