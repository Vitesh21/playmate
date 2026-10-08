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
import { colors, spacing, radius, typography } from '@theme/index';
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
  const hasError = !!error;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          hasError && styles.inputWrapperError,
          multiline && styles.inputWrapperMultiline,
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          placeholderTextColor={colors.text.tertiary}
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            multiline && styles.inputMultiline,
            style,
          ]}
          multiline={multiline}
          {...rest}
        />
        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            style={styles.iconRight}
            hitSlop={spacing.sm}
          >
            {rightIcon}
          </Pressable>
        )}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
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

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },
  label: {
    ...typography.subtitle2,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputWrapperError: {
    borderColor: colors.error[500],
    backgroundColor: colors.error[50],
  },
  inputWrapperMultiline: {
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...typography.body1,
    color: colors.text.primary,
    minHeight: 48,
  },
  inputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },
  iconLeft: {
    paddingLeft: spacing.md,
  },
  iconRight: {
    paddingRight: spacing.md,
    paddingLeft: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: colors.error[600],
    marginTop: spacing.xs,
  },
  helper: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
});

export default Input;
