import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Card from '@components/ui/Card';
import Badge from '@components/ui/Badge';
import { colors, spacing, radius, typography } from '@theme/index';
import { formatCurrency, formatDate } from '@utils/index';
import type { Venue } from '@playmate/types';

interface VenueCardProps {
  venue: Venue;
  sportName?: string;
  onPress?: () => void;
}

export const VenueCard: React.FC<VenueCardProps> = ({ venue, sportName, onPress }) => {
  const coverImage = venue.images?.[0];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card elevation="sm" padding="none" style={styles.card}>
        <View style={styles.imageWrapper}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={[styles.image, styles.placeholderImage]}>
              <Text style={styles.placeholderText}>{venue.name.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.badgeRow}>
            {sportName && <Badge label={sportName} variant="primary" size="sm" />}
            {venue.isActive === false && <Badge label="Inactive" variant="warning" size="sm" />}
          </View>
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {venue.name}
          </Text>
          <Text style={styles.address} numberOfLines={1}>
            {venue.city} · {venue.amenities.slice(0, 2).join(' · ')}
          </Text>
          <View style={styles.footer}>
            <View style={styles.amenities}>
              {venue.amenities.slice(0, 3).map((amenity, idx) => (
                <Text key={idx} style={styles.amenity}>
                  {amenity}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  imageWrapper: {
    position: 'relative',
    height: 160,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  placeholderImage: {
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...typography.h1,
    color: colors.primary[600],
  },
  badgeRow: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  content: {
    padding: spacing.md,
  },
  title: {
    ...typography.h5,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  address: {
    ...typography.body2,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  amenity: {
    ...typography.caption,
    color: colors.primary[700],
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
});

export default VenueCard;
