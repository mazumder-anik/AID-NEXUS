package com.smartresource.matcher.model;

import java.util.List;

/** Represents a relief need sent from the Node.js backend for matching. */
public class Need {

    private Long id;
    private List<String> skillsRequired;
    private double lat;
    private double lng;
    private double urgencyScore;

    public Need() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public List<String> getSkillsRequired() { return skillsRequired; }
    public void setSkillsRequired(List<String> skillsRequired) { this.skillsRequired = skillsRequired; }

    public double getLat() { return lat; }
    public void setLat(double lat) { this.lat = lat; }

    public double getLng() { return lng; }
    public void setLng(double lng) { this.lng = lng; }

    public double getUrgencyScore() { return urgencyScore; }
    public void setUrgencyScore(double urgencyScore) { this.urgencyScore = urgencyScore; }
}
