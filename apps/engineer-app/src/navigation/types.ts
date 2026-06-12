import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  DesignSystem: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  IncomingOffer: undefined;
  Navigate: undefined;
  StartJob: undefined;
  JobInProgress: undefined;
  CloseJob: undefined;
  RateCustomer: undefined;
};

export type AppScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, T>;
export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
