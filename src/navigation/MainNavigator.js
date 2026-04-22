import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { 
  HomeScreen, 
  PatientFormScreen, 
  CameraScreen, 
  ResultsScreen,
  SettingsScreen,
  HistoryScreen,
  ChatScreen,
  ReminderSettingsScreen,
  DataManagementScreen,
  DoctorSetupScreen,
} from '../screens';

const Stack = createNativeStackNavigator();

const MainNavigator = ({ user }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#007AFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="Home" 
        options={{ headerShown: false }}
      >
        {(props) => <HomeScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen 
        name="PatientForm" 
        component={PatientFormScreen}
        options={{ title: 'Patient Information' }}
      />
      <Stack.Screen 
        name="Camera" 
        component={CameraScreen}
        options={{ title: 'Capture Image', headerShown: false }}
      />
      <Stack.Screen 
        name="Results" 
        component={ResultsScreen}
        options={{ title: 'Analysis Results' }}
      />
      <Stack.Screen 
        name="History" 
        component={HistoryScreen}
        options={{ title: 'Wound Journal' }}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{ title: 'AI Assistant', headerShown: false }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen 
        name="ReminderSettings" 
        component={ReminderSettingsScreen}
        options={{ title: 'Care Reminders' }}
      />
      <Stack.Screen 
        name="DataManagement" 
        component={DataManagementScreen}
        options={{ title: 'Data & Storage' }}
      />
      <Stack.Screen 
        name="DoctorSetup" 
        component={DoctorSetupScreen}
        options={{ title: 'My Doctor' }}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;
