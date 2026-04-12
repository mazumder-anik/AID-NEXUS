package com.smartresource.matcher.service;

import com.smartresource.matcher.model.MatchResult;
import com.smartresource.matcher.model.Need;
import com.smartresource.matcher.model.Volunteer;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Core volunteer–need matching algorithm.
 *
 * Match Score = (Skill Overlap Score × 0.6) + (Proximity Score × 0.4)
 *
 * Skill Overlap Score: fraction of required skills that the volunteer possesses.
 * Proximity Score:     1 − clamp(haversineDistanceKm / MAX_KM, 0, 1)
 */
@Service
public class MatchingService {

    private static final double MAX_DISTANCE_KM = 100.0;
    private static final double SKILL_WEIGHT    = 0.6;
    private static final double PROXIMITY_WEIGHT = 0.4;

    /**
     * Compute all valid (need, volunteer) matches and return them sorted
     * by descending match score.
     */
    public List<MatchResult> match(List<Need> needs, List<Volunteer> volunteers) {
        List<MatchResult> results = new ArrayList<>();

        for (Need need : needs) {
            for (Volunteer vol : volunteers) {
                if (!vol.isAvailable()) continue;

                double skillScore     = computeSkillScore(need.getSkillsRequired(), vol.getSkills());
                double proximityScore = computeProximityScore(need.getLat(), need.getLng(),
                                                               vol.getLat(),  vol.getLng());
                double matchScore     = (skillScore * SKILL_WEIGHT) + (proximityScore * PROXIMITY_WEIGHT);

                // Only include pairs with at least some relevance
                if (matchScore > 0.05) {
                    results.add(new MatchResult(need.getId(), vol.getId(),
                                                round(matchScore), round(skillScore), round(proximityScore)));
                }
            }
        }

        // Sort descending by overall match score
        results.sort((a, b) -> Double.compare(b.getMatchScore(), a.getMatchScore()));
        return results;
    }

    // ── Skill Overlap ────────────────────────────────────────────────────────

    /**
     * Fraction of required skills that the volunteer can supply.
     * Returns 1.0 if no skills are required (any volunteer qualifies).
     */
    private double computeSkillScore(List<String> required, List<String> available) {
        if (required == null || required.isEmpty()) return 1.0;
        if (available == null || available.isEmpty()) return 0.0;

        Set<String> availableSet = available.stream()
                .map(String::toLowerCase)
                .collect(Collectors.toCollection(HashSet::new));

        long overlap = required.stream()
                .map(String::toLowerCase)
                .filter(availableSet::contains)
                .count();

        return (double) overlap / required.size();
    }

    // ── Proximity (Haversine) ─────────────────────────────────────────────────

    private double computeProximityScore(double lat1, double lng1, double lat2, double lng2) {
        double distanceKm = haversine(lat1, lng1, lat2, lng2);
        return 1.0 - Math.min(distanceKm / MAX_DISTANCE_KM, 1.0);
    }

    /**
     * Haversine formula — great-circle distance between two points on Earth (km).
     */
    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0; // Earth radius in km

        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private double round(double v) {
        return Math.round(v * 10000.0) / 10000.0;
    }
}
