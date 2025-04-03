import { create } from "zustand"
import type { Teacher, SubjectAssignment } from "../types"
import { getTeachers, addTeacher, updateTeacher, deleteTeacher } from "../lib/api/teachers"
import { assignTeacher, removeTeacher, getAllSubjects, createSubject } from "../lib/api/subjects"

interface TeacherState {
  teachers: Teacher[]
  subjects: any[] // Store all subjects
  subjectAssignments: SubjectAssignment[]
  loading: boolean
  error: string | null
  fetchTeachers: () => Promise<void>
  fetchSubjects: () => Promise<void>
  addTeacher: (
    teacher: Omit<Teacher, "id" | "hasSetPassword" | "subjects" | "password" | "department">,
  ) => Promise<void>
  updateTeacher: (id: string, teacher: Partial<Teacher>) => Promise<void>
  deleteTeacher: (id: string) => Promise<void>
  assignSubject: (assignment: Omit<SubjectAssignment, "id">) => Promise<void>
  removeSubjectAssignment: (assignmentId: string) => Promise<void>
  getTeacherAssignments: (teacherId: string) => SubjectAssignment[]
  isSubjectAssigned: (subjectCode: string, department: string, semester: number, class_: string) => boolean
}

export const useTeacherStore = create<TeacherState>((set, get) => ({
  teachers: [],
  subjects: [],
  subjectAssignments: [],
  loading: false,
  error: null,

  fetchTeachers: async () => {
    set({ loading: true, error: null })
    try {
      const teachers = await getTeachers()
      set({ teachers, loading: false })
    } catch (error) {
      console.error("Fetch teachers error:", error)
      set({ error: "Failed to fetch teachers", loading: false })
    }
  },

  fetchSubjects: async () => {
    // Check if subjects are already loaded to prevent unnecessary fetches
    if (get().subjects.length > 0) return

    set({ loading: true, error: null })
    try {
      const subjects = await getAllSubjects()
      set({ subjects, loading: false })
    } catch (error) {
      console.error("Fetch subjects error:", error)
      set({ error: "Failed to fetch subjects", loading: false })
    }
  },

  addTeacher: async (teacherData) => {
    set({ loading: true, error: null })
    try {
      const newTeacher = await addTeacher(teacherData)
      set((state) => ({
        teachers: [
          ...state.teachers,
          {
            ...newTeacher,
            department: "",
            subjects: [],
            hasSetPassword: false,
          },
        ],
        loading: false,
      }))
    } catch (error) {
      console.error("Add teacher error:", error)
      set({ error: "Failed to add teacher", loading: false })
      throw error
    }
  },

  updateTeacher: async (id, teacherData) => {
    set({ loading: true, error: null })
    try {
      const updatedTeacher = await updateTeacher(id, teacherData)
      set((state) => ({
        teachers: state.teachers.map((teacher) => (teacher.id === id ? { ...teacher, ...updatedTeacher } : teacher)),
        loading: false,
      }))
    } catch (error) {
      console.error("Update teacher error:", error)
      set({ error: "Failed to update teacher", loading: false })
      throw error
    }
  },

  deleteTeacher: async (id) => {
    set({ loading: true, error: null })
    try {
      await deleteTeacher(id)
      set((state) => ({
        teachers: state.teachers.filter((teacher) => teacher.id !== id),
        subjectAssignments: state.subjectAssignments.filter((assignment) => assignment.teacherId !== id),
        loading: false,
      }))
    } catch (error) {
      console.error("Delete teacher error:", error)
      set({ error: "Failed to delete teacher", loading: false })
      throw error
    }
  },

  assignSubject: async (assignment) => {
    set({ loading: true, error: null })
    try {
      // Find the teacher to get their name and username
      const teacher = get().teachers.find((t) => t.id === assignment.teacherId)
      if (!teacher) {
        throw new Error("Teacher not found")
      }

      // Check if a subject with the same code, department, semester, and class already exists
      const existingSubject = get().subjects.find(
        (s) =>
          s.code === assignment.subjectCode &&
          s.department === assignment.department &&
          s.semester === assignment.semester,
      )

      let subjectId

      if (existingSubject) {
        // If subject exists, use its ID
        subjectId = existingSubject._id

        // Check if this subject is already assigned to a teacher for the same class
        const isAssignedToClass = get().subjectAssignments.some(
          (a) =>
            a.subjectCode === assignment.subjectCode &&
            a.department === assignment.department &&
            a.semester === assignment.semester &&
            a.class === assignment.class,
        )

        if (isAssignedToClass) {
          throw new Error("This subject is already assigned to a teacher for this class")
        }
      } else {
        // If subject doesn't exist, create a new one
        const newSubject = {
          code: assignment.subjectCode,
          name: assignment.subjectName,
          department: assignment.department,
          semester: assignment.semester,
          isLab: assignment.isLab,
        }

        // Call API to create the subject
        const createdSubject = await createSubject(newSubject)
        subjectId = createdSubject._id

        // Add the new subject to the local state
        set((state) => ({
          subjects: [...state.subjects, createdSubject],
        }))
      }

      // Call the backend API to assign the teacher to the subject
      await assignTeacher(subjectId, assignment.teacherId)

      // Update local state with teacher information
      const newAssignment: SubjectAssignment = {
        id: Date.now().toString(), // This will be replaced by the actual ID from the backend
        ...assignment,
        teacherName: teacher.name,
        teacherUsername: teacher.username,
      }

      set((state) => ({
        subjectAssignments: [...state.subjectAssignments, newAssignment],
        loading: false,
      }))
    } catch (error) {
      console.error("Assign subject error:", error)
      set({ error: "Failed to assign subject", loading: false })
      throw error
    }
  },

  removeSubjectAssignment: async (assignmentId) => {
    set({ loading: true, error: null })
    try {
      const assignment = get().subjectAssignments.find((a) => a.id === assignmentId)
      if (!assignment) {
        throw new Error("Assignment not found")
      }

      // Find the subject in our subjects list
      const subject = get().subjects.find(
        (s) =>
          s.code === assignment.subjectCode &&
          s.department === assignment.department &&
          s.semester === assignment.semester,
      )

      if (!subject) {
        throw new Error("Subject not found")
      }

      // Call the backend API to remove the teacher from the subject
      await removeTeacher(subject._id, assignment.teacherId)

      // Update local state
      set((state) => ({
        subjectAssignments: state.subjectAssignments.filter((a) => a.id !== assignmentId),
        loading: false,
      }))
    } catch (error) {
      console.error("Remove subject assignment error:", error)
      set({ error: "Failed to remove subject assignment", loading: false })
      throw error
    }
  },

  getTeacherAssignments: (teacherId) => {
    // Get all assignments for this teacher
    const assignments = get().subjectAssignments.filter((assignment) => assignment.teacherId === teacherId)

    // Make sure we have all the necessary information
    return assignments.map((assignment) => {
      const teacher = get().teachers.find((t) => t.id === assignment.teacherId)
      return {
        ...assignment,
        // Ensure teacherName is included
        teacherName: teacher?.name || "Unknown Teacher",
        teacherUsername: teacher?.username || "",
      }
    })
  },

  isSubjectAssigned: (subjectCode, department, semester, class_) => {
    return get().subjectAssignments.some(
      (assignment) =>
        assignment.subjectCode.toLowerCase() === subjectCode.toLowerCase() &&
        assignment.department.toLowerCase() === department.toLowerCase() &&
        assignment.semester === semester &&
        assignment.class.toLowerCase() === class_.toLowerCase(),
    )
  },
}))

