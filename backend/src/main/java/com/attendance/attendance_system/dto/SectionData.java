package com.attendance.attendance_system.dto;

import com.attendance.attendance_system.model.User;
import lombok.Data;

import java.util.List;

@Data
public class SectionData {
    private String section;
    private List<User> students;

    // Constructor
    public SectionData(String section, List<User> students) {
        this.section = section;
        this.students = students;
    }


}
