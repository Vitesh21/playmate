import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { useAuthStore } from '@store/auth.store';
import { colors, spacing } from '@theme/index';
import type {
  AuthStackParamList,
  HomeStackParamList,
  ShopStackParamList,
  BookingsStackParamList,
  ProfileStackParamList,
  RootTabParamList,
  RootStackParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ShopStack = createNativeStackNavigator<ShopStackParamList>();
const BookingsStack = createNativeStackNavigator<BookingsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const RootTab = createBottomTabNavigator<RootTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary[600],
    background: colors.background.screen,
    card: colors.background.primary,
    text: colors.text.primary,
    border: colors.border.light,
    notification: colors.error[500],
  },
};

function Placeholder({ title }: { title: string }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text.primary }}>{title}</Text>
    </View>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background.primary },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background.screen },
      }}
    >
      <AuthStack.Screen name="Login" options={{ title: 'Welcome Back' }}>
        {() => <Placeholder title="Login Screen" />}
      </AuthStack.Screen>
      <AuthStack.Screen name="Register" options={{ title: 'Create Account' }}>
        {() => <Placeholder title="Register Screen" />}
      </AuthStack.Screen>
      <AuthStack.Screen name="ForgotPassword" options={{ title: 'Reset Password' }}>
        {() => <Placeholder title="Forgot Password Screen" />}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

function HomeNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background.primary },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background.screen },
      }}
    >
      <HomeStack.Screen name="Home" options={{ title: 'Playmate' }}>
        {() => <Placeholder title="Home Screen" />}
      </HomeStack.Screen>
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
        {() => <Placeholder title="Confirm Booking" />}
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
        {() => <Placeholder title="Search" />}
      </HomeStack.Screen>
    </HomeStack.Navigator>
  );
}

function ShopNavigator() {
  return (
    <ShopStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background.primary },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background.screen },
      }}
    >
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
  return (
    <BookingsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background.primary },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background.screen },
      }}
    >
      <BookingsStack.Screen name="BookingsList" options={{ title: 'My Bookings' }}>
        {() => <Placeholder title="Bookings List" />}
      </BookingsStack.Screen>
      <BookingsStack.Screen name="BookingDetail" options={{ title: 'Booking' }}>
        {() => <Placeholder title="Booking Detail" />}
      </BookingsStack.Screen>
    </BookingsStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background.primary },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background.screen },
      }}
    >
      <ProfileStack.Screen name="ProfileHome" options={{ title: 'Profile' }}>
        {() => <Placeholder title="Profile Home" />}
      </ProfileStack.Screen>
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
        {() => <Placeholder title="Settings" />}
      </ProfileStack.Screen>
    </ProfileStack.Navigator>
  );
}

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: focused ? '700' : '500',
        color: focused ? colors.primary[600] : colors.text.tertiary,
        marginTop: spacing.xs,
      }}
    >
      {label}
    </Text>
  );
}

function MainNavigator() {
  return (
    <RootTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background.primary,
          borderTopColor: colors.border.light,
          height: 64,
          paddingBottom: spacing.md,
          paddingTop: spacing.sm,
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
          tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
        }}
      />
      <RootTab.Screen
        name="ShopTab"
        component={ShopNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Shop" focused={focused} />,
        }}
      />
      <RootTab.Screen
        name="BookingsTab"
        component={BookingsNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Bookings" focused={focused} />,
        }}
      />
      <RootTab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} />,
        }}
      />
    </RootTab.Navigator>
  );
}

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <NavigationContainer theme={navTheme}>
        <Placeholder title="Loading..." />
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
