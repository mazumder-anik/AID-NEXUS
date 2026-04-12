package com.smartresource.matcher.model;

import java.util.List;

/** Response body returned by the matcher service. */
public class MatchResponse {

    private List<MatchResult> matches;
    private int totalNeeds;
    private int totalVolunteers;

    public MatchResponse() {}

    public MatchResponse(List<MatchResult> matches, int totalNeeds, int totalVolunteers) {
        this.matches = matches;
        this.totalNeeds = totalNeeds;
        this.totalVolunteers = totalVolunteers;
    }

    public List<MatchResult> getMatches() { return matches; }
    public void setMatches(List<MatchResult> matches) { this.matches = matches; }

    public int getTotalNeeds() { return totalNeeds; }
    public void setTotalNeeds(int totalNeeds) { this.totalNeeds = totalNeeds; }

    public int getTotalVolunteers() { return totalVolunteers; }
    public void setTotalVolunteers(int totalVolunteers) { this.totalVolunteers = totalVolunteers; }
}
