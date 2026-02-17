import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './context/AppContext';

import HomeScreen from './screens/HomeScreen';
import CaseDetailScreen from './screens/CaseDetailScreen';
import AddCaseScreen from './screens/AddCaseScreen';
import ClientsScreen from './screens/ClientsScreen';
import ClientDetailScreen from './screens/ClientDetailScreen';
import WeeklyScreen from './screens/WeeklyScreen';
import SettingsScreen from './screens/SettingsScreen';
import BareActsScreen from './screens/BareActsScreen';
import FirBuilderScreen from './screens/FirBuilderScreen';
import DocumentsScreen from './screens/DocumentsScreen';
import CaseDocumentsScreen from './screens/CaseDocumentsScreen';
import ClosedCasesScreen from './screens/ClosedCasesScreen';
import ActivityLogScreen from './screens/ActivityLogScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

const Stack = createNativeStackNavigator();

function Navigation() {
  const { user, loading } = useApp();

  if (loading) return null; // Or a splash screen

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Case Detail" component={CaseDetailScreen} />
            <Stack.Screen name="Add Case" component={AddCaseScreen} />
            <Stack.Screen name="Clients" component={ClientsScreen} />
            <Stack.Screen name="Client Detail" component={ClientDetailScreen} />
            <Stack.Screen name="Weekly Planner" component={WeeklyScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Bare Acts" component={BareActsScreen} />
            <Stack.Screen name="FIR Builder" component={FirBuilderScreen} />
            <Stack.Screen name="Documents" component={DocumentsScreen} />
            <Stack.Screen name="Case Documents" component={CaseDocumentsScreen} />
            <Stack.Screen name="Closed Cases" component={ClosedCasesScreen} />
            <Stack.Screen name="Activity Log" component={ActivityLogScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Navigation />
      </AppProvider>
    </SafeAreaProvider>
  );
}
