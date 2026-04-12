package com.smartresource.matcher.model;

/** A single match result with individual component scores. */
public class MatchResult {

    private Long needId;
    private Long volunteerId;
    private double matchScore;
    private double skillScore;
    private double proximityScore;

    public MatchResult() {}

    public MatchResult(Long needId, Long volunteerId, double matchScore,
                       double skillScore, double proximityScore) {
        this.needId = needId;
        this.volunteerId = volunteerId;
        this.matchScore = matchScore;
        this.skillScore = skillScore;
        this.proximityScore = proximityScore;
    }

    public Long getNeedId() { return needId; }
    public void setNeedId(Long needId) { this.needId = needId; }

    public Long getVolunteerId() { return volunteerId; }
    public void setVolunteerId(Long volunteerId) { this.volunteerId = volunteerId; }

    public double getMatchScore() { return matchScore; }
    public void setMatchScore(double matchScore) { this.matchScore = matchScore; }

    public double getSkillScore() { return skillScore; }
    public void setSkillScore(double skillScore) { this.skillScore = skillScore; }

    public double getProximityScore() { return proximityScore; }
    public void setProximityScore(double proximityScore) { this.proximityScore = proximityScore; }
}
