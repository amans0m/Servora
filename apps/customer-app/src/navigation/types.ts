import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  DesignSystem: undefined;
};

/** Flow screens live on the root stack (above the tabs), reachable from any tab. */
export type AppStackParamList = {
  Tabs: undefined;
  ServiceDetail: { serviceId: string };
  CustomRequest: { categoryName?: string } | undefined;
  ConfirmBooking: { serviceId: string; addonIds: string[] };
  LiveTracking: { bookingId: string };
  ChangeEngineer: { bookingId: string };
  Reschedule: { bookingId: string };
  CompletePay: { bookingId: string };
  RateJob: { bookingId: string };
};

export type AppScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<
  AppStackParamList,
  T
>;
export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;
