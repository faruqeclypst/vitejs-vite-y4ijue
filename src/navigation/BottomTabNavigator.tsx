import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { Users, ClipboardList, Calendar, UserPlus, FileText } from 'lucide-react';
import HomePage from '../pages/LandingPage';
import TeachersPage from '../pages/TeachersPage';
import RosterPage from '../pages/RosterPage';
import AttendancePage from '../pages/AttendancePage';
import StudentsPage from '../components/StudentManagement';
import LeaveRequestPage from '../components/StudentLeaveRequest';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          display: Platform.OS === 'android' ? 'flex' : 'none',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomePage}
        options={{
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Teachers"
        component={TeachersPage}
        options={{
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Roster"
        component={RosterPage}
        options={{
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendancePage}
        options={{
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Students"
        component={StudentsPage}
        options={{
          tabBarIcon: ({ color, size }) => <UserPlus color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="LeaveRequest"
        component={LeaveRequestPage}
        options={{
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;