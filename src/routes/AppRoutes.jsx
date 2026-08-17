import { Routes, Route, Navigate } from 'react-router-dom';

import Home from '../pages/public/Home.jsx';
import Courses from '../pages/public/Courses.jsx';
import About from '../pages/public/About.jsx';
import Contact from '../pages/public/Contact.jsx';
import Login from '../pages/public/Login.jsx';
import Register from '../pages/public/Register.jsx';

import StudentRoute from './StudentRoute.jsx';
import AdminRoute from './AdminRoute.jsx';

import StudentLayout from '../pages/student/StudentLayout.jsx';
import Dashboard from '../pages/student/Dashboard.jsx';
import MyCourses from '../pages/student/MyCourses.jsx';
import CourseDetails from '../pages/student/CourseDetails.jsx';
import HomeworkTake from '../pages/student/HomeworkTake.jsx';
import Exams from '../pages/student/Exams.jsx';
import TakeExam from '../pages/student/TakeExam.jsx';
import Grades from '../pages/student/Grades.jsx';
import Bookings from '../pages/student/Bookings.jsx';
import Competitions from '../pages/student/Competitions.jsx';
import CompetitionDetails from '../pages/student/CompetitionDetails.jsx';
import Notifications from '../pages/student/Notifications.jsx';
import Profile from '../pages/student/Profile.jsx';
import StudentChat from '../pages/student/Chat.jsx';

import AdminLayout from '../pages/admin/AdminLayout.jsx';
import AdminDashboard from '../pages/admin/Dashboard.jsx';
import AdminExams from '../pages/admin/exams/Exams.jsx';
import CreateExam from '../pages/admin/exams/CreateExam.jsx';
import EditExam from '../pages/admin/exams/EditExam.jsx';
import ExamQuestions from '../pages/admin/exams/ExamQuestions.jsx';
import ExamResults from '../pages/admin/exams/ExamResults.jsx';
import AdminCourses from '../pages/admin/courses/Courses.jsx';
import CreateCourse from '../pages/admin/courses/CreateCourse.jsx';
import EditCourse from '../pages/admin/courses/EditCourse.jsx';
import CourseManager from '../pages/admin/courses/CourseManager.jsx';
import AdminSections from '../pages/admin/sections/Sections.jsx';
import AdminBookings from '../pages/admin/bookings/Bookings.jsx';
import AdminCompetitions from '../pages/admin/competitions/Competitions.jsx';
import CreateCompetition from '../pages/admin/competitions/CreateCompetition.jsx';
import EditCompetition from '../pages/admin/competitions/EditCompetition.jsx';
import AdminStudents from '../pages/admin/students/Students.jsx';
import StudentDetails from '../pages/admin/students/StudentDetails.jsx';
import ContactLinks from '../pages/admin/contacts/ContactLinks.jsx';
import AdminSettings from '../pages/admin/settings/Settings.jsx';
import AdminChat from '../pages/admin/Chat.jsx';

import NotFound from '../pages/errors/NotFound.jsx';
import Unauthorized from '../pages/errors/Unauthorized.jsx';
import ServerError from '../pages/errors/ServerError.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      {/* عام */}
      <Route path="/" element={<Home />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* بوابة الطالب */}
      <Route
        path="/student"
        element={
          <StudentRoute>
            <StudentLayout />
          </StudentRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="courses" element={<MyCourses />} />
        <Route path="courses/:courseId" element={<CourseDetails />} />
        <Route path="courses/:courseId/homework/:homeworkId" element={<HomeworkTake />} />
        <Route path="exams" element={<Exams />} />
        <Route path="exams/:examId" element={<TakeExam />} />
        <Route path="grades" element={<Grades />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="competitions" element={<Competitions />} />
        <Route path="competitions/:id" element={<CompetitionDetails />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="chat" element={<StudentChat />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* لوحة تحكم الأدمن — محمية بالصلاحية من السيرفر أيضاً */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="exams" element={<AdminExams />} />
        <Route path="exams/new" element={<CreateExam />} />
        <Route path="exams/:examId" element={<EditExam />} />
        <Route path="exams/:examId/questions" element={<ExamQuestions />} />
        <Route path="exams/:examId/results" element={<ExamResults />} />
        <Route path="courses" element={<AdminCourses />} />
        <Route path="courses/new" element={<CreateCourse />} />
        <Route path="courses/:courseId" element={<EditCourse />} />
        <Route path="courses/:courseId/manage" element={<CourseManager />} />
        <Route path="sections" element={<AdminSections />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="competitions" element={<AdminCompetitions />} />
        <Route path="competitions/new" element={<CreateCompetition />} />
        <Route path="competitions/:id" element={<EditCompetition />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="students/:studentId" element={<StudentDetails />} />
        <Route path="chat" element={<AdminChat />} />
        <Route path="contacts" element={<ContactLinks />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* أخطاء */}
      <Route path="/403" element={<Unauthorized />} />
      <Route path="/500" element={<ServerError />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}