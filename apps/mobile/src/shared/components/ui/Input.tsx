import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
  Pressable,
} from 'react-native';
import { useTheme } from '@theme/index';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';

interface BaseInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  containerStyle?: StyleProp<ViewStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export const Input: React.FC<BaseInputProps> = ({
  label,
  error,
  helper,
  containerStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  multiline,
  ...rest
}) => {
  const { colors, spacing, radius, typography } = useTheme();

  const s = StyleSheet.create({
    container: { width: '100%', marginBottom: spacing.md },
    label: { ...typography.subtitle2, color: colors.text.secondary, marginBottom: spacing.xs },
    wrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.secondary,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    wrapperError: {
      borderColor: colors.error[500],
      backgroundColor: colors.error[50],
    },
    wrapperMultiline: { alignItems: 'flex-start' },
    input: {
      flex: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      ...typography.body1,
      color: colors.text.primary,
      minHeight: 48,
    },
    inputMultiline: { minHeight: 120, textAlignVertical: 'top' },
    inputWithLeftIcon: { paddingLeft: 0 },
    inputWithRightIcon: { paddingRight: 0 },
    iconLeft: { paddingLeft: spacing.md },
    iconRight: { paddingRight: spacing.md, paddingLeft: spacing.sm },
    error: { ...typography.caption, color: colors.error[600], marginTop: spacing.xs },
    helper: { ...typography.caption, color: colors.text.tertiary, marginTop: spacing.xs },
  });

  const hasError = !!error;

  return (
    <View style={[s.container, containerStyle]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={[s.wrapper, hasError && s.wrapperError, multiline && s.wrapperMultiline]}>
        {leftIcon ? <View style={s.iconLeft}>{leftIcon}</View> : null}
        <TextInput
          placeholderTextColor={colors.text.tertiary}
          style={[
            s.input,
            Boolean(leftIcon) && s.inputWithLeftIcon,
            Boolean(rightIcon) && s.inputWithRightIcon,
            Boolean(multiline) && s.inputMultiline,
            style,
          ]}
          multiline={multiline}
          {...rest}
        />
        {rightIcon ? (
          <Pressable onPress={onRightIconPress} style={s.iconRight} hitSlop={spacing.sm}>
            {rightIcon}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={s.error}>{error}</Text>
      ) : helper ? (
        <Text style={s.helper}>{helper}</Text>
      ) : null}
    </View>
  );
};

interface FormInputProps<T extends FieldValues> extends Omit<BaseInputProps, 'error'> {
  control: Control<T>;
  name: Path<T>;
}

export function FormInput<T extends FieldValues>({
  control,
  name,
  ...rest
}: FormInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <Input
          {...rest}
          value={value as string}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error?.message}
        />
      )}
    />
  );
}

export default Input;
