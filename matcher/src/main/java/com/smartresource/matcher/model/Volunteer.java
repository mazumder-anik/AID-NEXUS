package com.smartresource.matcher.model;

import java.util.List;

/** Represents a volunteer sent from the Node.js backend for matching. */
public class Volunteer {

    private Long id;
    private List<String> skills;
    private double lat;
    private double lng;
    private boolean available;

    public Volunteer() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public List<String> getSkills() { return skills; }
    public void setSkills(List<String> skills) { this.skills = skills; }

    public double getLat() { return lat; }
    public void setLat(double lat) { this.lat = lat; }

    public double getLng() { return lng; }
    public void setLng(double lng) { this.lng = lng; }

    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
}
