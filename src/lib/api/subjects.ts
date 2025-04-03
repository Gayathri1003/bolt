import axios from "axios"
import type { Subject } from "../../types"

const API_URL = "http://localhost:5000/api"

// Update the getAllSubjects function to ensure it returns populated teacher data
export async function getAllSubjects() {
  const { data } = await axios.get(`${API_URL}/subjects`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  })
  return data
}

export async function getTeacherSubjects() {
  const { data } = await axios.get(`${API_URL}/subjects/teacher`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  })
  return data
}

// Update the createSubject function to handle the correct subject structure
export async function createSubject(subject: Omit<Subject, "id">) {
  const { data } = await axios.post(
    `${API_URL}/subjects`,
    {
      code: subject.code,
      name: subject.name,
      department: subject.department,
      semester: subject.semester,
      isLab: subject.isLab || false,
    },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    },
  )
  return data
}

export async function assignTeacher(subjectId: string, teacherId: string) {
  const { data } = await axios.post(
    `${API_URL}/subjects/assign-teacher`,
    {
      subjectId,
      teacherId,
    },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    },
  )
  return data
}

export async function removeTeacher(subjectId: string, teacherId: string) {
  const { data } = await axios.post(
    `${API_URL}/subjects/remove-teacher`,
    {
      subjectId,
      teacherId,
    },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    },
  )
  return data
}

