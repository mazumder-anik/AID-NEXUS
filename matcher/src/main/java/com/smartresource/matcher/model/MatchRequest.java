package com.smartresource.matcher.model;

import java.util.List;

/** Request body sent by the Node.js backend to the matcher service. */
public class MatchRequest {

    private List<Need> needs;
    private List<Volunteer> volunteers;

    public MatchRequest() {}

    public List<Need> getNeeds() { return needs; }
    public void setNeeds(List<Need> needs) { this.needs = needs; }

    public List<Volunteer> getVolunteers() { return volunteers; }
    public void setVolunteers(List<Volunteer> volunteers) { this.volunteers = volunteers; }
}
