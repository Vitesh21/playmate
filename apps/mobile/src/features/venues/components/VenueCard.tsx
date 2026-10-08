import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Card from '@components/ui/Card';
import Badge from '@components/ui/Badge';
import { useTheme } from '@theme/index';
import type { Venue } from '@playmate/types';

interface VenueCardProps {
  venue: Venue;
  sportName?: string;
  onPress?: () => void;
}

export const VenueCard: React.FC<VenueCardProps> = ({ venue, sportName, onPress }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const coverImage = venue.images?.[0];

  const s = StyleSheet.create({
    card: { marginBottom: spacing.md, overflow: 'hidden' },
    imageWrap: { position: 'relative', height: 160, width: '100%' },
    image: { width: '100%', height: '100%', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
    placeholder: {
      backgroundColor: colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderText: { ...typography.h1, color: colors.primary[600] },
    badges: { position: 'absolute', top: spacing.sm, left: spacing.sm, flexDirection: 'row', gap: spacing.xs },
    content: { padding: spacing.md },
    title: { ...typography.h5, color: colors.text.primary, marginBottom: spacing.xxs },
    address: { ...typography.body2, color: colors.text.tertiary, marginBottom: spacing.sm },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    amenity: {
      ...typography.caption,
      color: colors.primary[700],
      backgroundColor: colors.primary[50],
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      borderRadius: radius.sm,
    },
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card elevation="sm" padding="none" style={s.card}>
        <View style={s.imageWrap}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={s.image} contentFit="cover" />
          ) : (
            <View style={[s.image, s.placeholder]}>
              <Text style={s.placeholderText}>{venue.name.charAt(0)}</Text>
            </View>
          )}
          <View style={s.badges}>
            {sportName ? <Badge label={sportName} variant="primary" size="sm" /> : null}
            {venue.isActive === false ? <Badge label="Inactive" variant="warning" size="sm" /> : null}
          </View>
        </View>
        <View style={s.content}>
          <Text style={s.title} numberOfLines={1}>
            {venue.name}
          </Text>
          <Text style={s.address} numberOfLines={1}>
            {venue.city} · {venue.amenities.slice(0, 2).join(' · ')}
          </Text>
          <View style={s.footer}>
            <View style={s.amenities}>
              {venue.amenities.slice(0, 3).map((a, i) => (
                <Text key={i} style={s.amenity}>
                  {a}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

export default VenueCard;
