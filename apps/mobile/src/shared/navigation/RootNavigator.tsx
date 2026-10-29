import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  NavigationContainer,
  DefaultTheme as NavDefault,
  DarkTheme as NavDark,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useAuthStore } from '@store/auth.store';
import { useTheme } from '@theme/index';
import { LoginScreen, RegisterScreen, ForgotPasswordScreen } from '@features/auth';
import { HomeScreen } from '@features/home';
import { ProfileScreen } from '@features/profile';
import { AdminDashboardScreen } from '@features/admin';
import { ManageVenuesScreen, CreateVenueScreen, ManageVenueSlotsScreen } from '@features/venues';
import { UserRole } from '@playmate/types';
import type {
  AuthStackParamList,
  HomeStackParamList,
  ShopStackParamList,
  BookingsStackParamList,
  ProfileStackParamList,
  ManageStackParamList,
  AdminStackParamList,
  RootTabParamList,
  RootStackParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ShopStack = createNativeStackNavigator<ShopStackParamList>();
const BookingsStack = createNativeStackNavigator<BookingsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const ManageStack = createNativeStackNavigator<ManageStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
const RootTab = createBottomTabNavigator<RootTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function Placeholder({ title }: { title: string }) {
  const { colors, typography } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={[{ color: colors.text.primary }, typography.h5]}>
        {title}
      </Text>
    </View>
  );
}

function screenOptions() {
  const { colors, typography } = useTheme();
  return {
    headerStyle: { backgroundColor: colors.background.primary, shadowColor: 'transparent' },
    headerTitleStyle: {
      ...typography.h5,
      color: colors.text.primary,
    },
    headerTintColor: colors.text.secondary,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background.screen },
  };
}

function AuthNavigator() {
  const opts = screenOptions();
  return (
    <AuthStack.Navigator screenOptions={opts}>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: 'Welcome Back' }} />
      <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset Password' }} />
    </AuthStack.Navigator>
  );
}

function HomeNavigator() {
  const opts = screenOptions();
  return (
    <HomeStack.Navigator screenOptions={opts}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ title: 'Playmate' }} />
      <HomeStack.Screen name="VenueDetail" options={{ title: 'Venue' }}>
        {() => <Placeholder title="Venue Detail" />}
      </HomeStack.Screen>
      <HomeStack.Screen name="CourtDetail" options={{ title: 'Court' }}>
        {() => <Placeholder title="Court Detail" />}
      </HomeStack.Screen>
      <HomeStack.Screen name="BookingSlotPicker" options={{ title: 'Select Slot' }}>
        {() => <Placeholder title="Slot Picker" />}
      </HomeStack.Screen>
      <HomeStack.Screen name="BookingConfirm" options={{ title: 'Confirm Booking' }}>
        {() => <Placeholder title="Confirm Booking + Essentials" />}
      </HomeStack.Screen>
      <HomeStack.Screen name="ProductDetail" options={{ title: 'Product' }}>
        {() => <Placeholder title="Product Detail" />}
      </HomeStack.Screen>
      <HomeStack.Screen name="CategoryProducts" options={{ title: 'Category' }}>
        {() => <Placeholder title="Category Products" />}
      </HomeStack.Screen>
      <HomeStack.Screen name="SportVenues" options={{ title: 'Venues' }}>
        {() => <Placeholder title="Sport Venues" />}
      </HomeStack.Screen>
      <HomeStack.Screen name="Search" options={{ title: 'Search' }}>
        {() => <Placeholder title="Search venues, products" />}
      </HomeStack.Screen>
    </HomeStack.Navigator>
  );
}

function ShopNavigator() {
  const opts = screenOptions();
  return (
    <ShopStack.Navigator screenOptions={opts}>
      <ShopStack.Screen name="ShopHome" options={{ title: 'Shop' }}>
        {() => <Placeholder title="Shop Home" />}
      </ShopStack.Screen>
      <ShopStack.Screen name="ProductDetail" options={{ title: 'Product' }}>
        {() => <Placeholder title="Product Detail" />}
      </ShopStack.Screen>
      <ShopStack.Screen name="Cart" options={{ title: 'Cart' }}>
        {() => <Placeholder title="Cart" />}
      </ShopStack.Screen>
      <ShopStack.Screen name="Checkout" options={{ title: 'Checkout' }}>
        {() => <Placeholder title="Checkout" />}
      </ShopStack.Screen>
      <ShopStack.Screen name="OrderSuccess" options={{ title: 'Order Placed', headerBackVisible: false }}>
        {() => <Placeholder title="Order Success" />}
      </ShopStack.Screen>
      <ShopStack.Screen name="OrderDetail" options={{ title: 'Order' }}>
        {() => <Placeholder title="Order Detail" />}
      </ShopStack.Screen>
    </ShopStack.Navigator>
  );
}

function BookingsNavigator() {
  const opts = screenOptions();
  return (
    <BookingsStack.Navigator screenOptions={opts}>
      <BookingsStack.Screen name="BookingsList" options={{ title: 'My Bookings' }}>
        {() => <Placeholder title="Bookings List" />}
      </BookingsStack.Screen>
      <BookingsStack.Screen name="BookingDetail" options={{ title: 'Booking' }}>
        {() => <Placeholder title="Booking + Essentials" />}
      </BookingsStack.Screen>
    </BookingsStack.Navigator>
  );
}

function ProfileNavigator() {
  const opts = screenOptions();
  return (
    <ProfileStack.Navigator screenOptions={opts}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: 'Profile' }} />
      <ProfileStack.Screen name="EditProfile" options={{ title: 'Edit Profile' }}>
        {() => <Placeholder title="Edit Profile" />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Orders" options={{ title: 'My Orders' }}>
        {() => <Placeholder title="Orders" />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Addresses" options={{ title: 'Addresses' }}>
        {() => <Placeholder title="Addresses" />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Reviews" options={{ title: 'My Reviews' }}>
        {() => <Placeholder title="Reviews" />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Notifications" options={{ title: 'Notifications' }}>
        {() => <Placeholder title="Notifications" />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Settings" options={{ title: 'Settings' }}>
        {() => <Placeholder title="Appearance · Theme · Dark Mode" />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Wallet" options={{ title: 'Wallet' }}>
        {() => <Placeholder title="Wallet + Prime" />}
      </ProfileStack.Screen>
    </ProfileStack.Navigator>
  );
}

function ManageNavigator() {
  const opts = screenOptions();
  return (
    <ManageStack.Navigator screenOptions={opts}>
      <ManageStack.Screen
        name="ManageHome"
        component={ManageVenuesScreen}
        options={{ title: 'My Venues' }}
      />
      <ManageStack.Screen
        name="CreateVenue"
        component={CreateVenueScreen}
        options={{ title: 'Post a Venue' }}
      />
      <ManageStack.Screen
        name="ManageSlots"
        component={ManageVenueSlotsScreen}
        options={{ title: 'Courts & Slots' }}
      />
    </ManageStack.Navigator>
  );
}

function AdminNavigator() {
  const opts = screenOptions();
  return (
    <AdminStack.Navigator screenOptions={opts}>
      <AdminStack.Screen
        name="AdminHome"
        component={AdminDashboardScreen}
        options={{ title: 'Admin' }}
      />
    </AdminStack.Navigator>
  );
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Text
      style={[
        typography.caption,
        {
          fontWeight: focused ? '700' : '500',
          color: focused ? colors.primary[600] : colors.text.tertiary,
          marginTop: spacing.xs,
        },
      ]}
    >
      {label}
    </Text>
  );
}

function MainNavigator() {
  const { colors } = useTheme();
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined;
  const effectiveRole = role ?? UserRole.USER;

  // Role-driven tab bar:
  //   USER / SELLER → Play · Shop · Bookings · Profile
  //   MEDIATOR      → Play · Manage · Bookings · Profile
  //   ADMIN         → Play · Shop · Bookings · Manage · Admin · Profile
  const showShop = effectiveRole === UserRole.USER || effectiveRole === UserRole.SELLER || effectiveRole === UserRole.ADMIN;
  const showManage = effectiveRole === UserRole.VENUE_OWNER || effectiveRole === UserRole.ADMIN;
  const showAdmin = effectiveRole === UserRole.ADMIN;

  return (
    <RootTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background.primary,
          borderTopColor: colors.border.light,
          height: 64,
          paddingBottom: 12,
          paddingTop: 8,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: { display: 'none' },
      }}
    >
      <RootTab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabLabel label="Play" focused={focused} />,
        }}
      />
      {showShop ? (
        <RootTab.Screen
          name="ShopTab"
          component={ShopNavigator}
          options={{
            tabBarIcon: ({ focused }) => <TabLabel label="Shop" focused={focused} />,
          }}
        />
      ) : null}
      <RootTab.Screen
        name="BookingsTab"
        component={BookingsNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabLabel label="Bookings" focused={focused} />,
        }}
      />
      {showManage ? (
        <RootTab.Screen
          name="ManageTab"
          component={ManageNavigator}
          options={{
            tabBarIcon: ({ focused }) => <TabLabel label="Manage" focused={focused} />,
          }}
        />
      ) : null}
      {showAdmin ? (
        <RootTab.Screen
          name="AdminTab"
          component={AdminNavigator}
          options={{
            tabBarIcon: ({ focused }) => <TabLabel label="Admin" focused={focused} />,
          }}
        />
      ) : null}
      <RootTab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabLabel label="Profile" focused={focused} />,
        }}
      />
    </RootTab.Navigator>
  );
}

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const { resolvedMode, colors, typography } = useTheme();

  const navTheme =
    resolvedMode === 'dark'
      ? {
          ...NavDark,
          colors: {
            ...NavDark.colors,
            primary: colors.primary[500],
            background: colors.background.screen,
            card: colors.background.primary,
            text: colors.text.primary,
            border: colors.border.light,
            notification: colors.error[500],
          },
        }
      : {
          ...NavDefault,
          colors: {
            ...NavDefault.colors,
            primary: colors.primary[600],
            background: colors.background.screen,
            card: colors.background.primary,
            text: colors.text.primary,
            border: colors.border.light,
            notification: colors.error[500],
          },
        };

  if (isLoading) {
    return (
      <NavigationContainer theme={navTheme}>
        <Placeholder title="Loading…" />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;
