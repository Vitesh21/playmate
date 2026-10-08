import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  VenueDetail: { venueId: string };
  CourtDetail: { courtId: string };
  BookingSlotPicker: { courtId: string; date?: string };
  BookingConfirm: { slotId: string };
  ProductDetail: { productId: string };
  CategoryProducts: { categoryId?: string; categorySlug?: string };
  SportVenues: { sportId: string };
  Search: undefined;
};

export type ShopStackParamList = {
  ShopHome: undefined;
  ProductDetail: { productId: string };
  CategoryProducts: { categoryId?: string; categorySlug?: string };
  Cart: undefined;
  Checkout: undefined;
  OrderSuccess: { orderId: string };
  OrderDetail: { orderId: string };
};

export type BookingsStackParamList = {
  BookingsList: undefined;
  BookingDetail: { bookingId: string };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  Orders: undefined;
  OrderDetail: { orderId: string };
  Addresses: undefined;
  AddressForm: { addressId?: string };
  Reviews: undefined;
  Notifications: undefined;
  Settings: undefined;
  Wallet: undefined;
};

export type RootTabParamList = {
  HomeTab: undefined;
  ShopTab: undefined;
  BookingsTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;
export type HomeScreenProps = NativeStackScreenProps<HomeStackParamList, 'Home'>;
export type VenueDetailScreenProps = NativeStackScreenProps<HomeStackParamList, 'VenueDetail'>;
export type ProductDetailScreenProps = NativeStackScreenProps<ShopStackParamList, 'ProductDetail'>;
export type CartScreenProps = NativeStackScreenProps<ShopStackParamList, 'Cart'>;
export type CheckoutScreenProps = NativeStackScreenProps<ShopStackParamList, 'Checkout'>;
export type BookingsListScreenProps = BottomTabScreenProps<BookingsStackParamList, 'BookingsList'>;
export type ProfileScreenProps = BottomTabScreenProps<ProfileStackParamList, 'ProfileHome'>;
