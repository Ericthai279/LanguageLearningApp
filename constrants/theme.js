import { StyleSheet } from 'react-native';

// Theme object (as provided)
export const theme = {
  colors: {
    primary: '#00C26F', // Green for primary actions
    primaryDark: '#00AC62', // Darker green for variations
    dark: '#3E3E3E', // Dark gray for backgrounds or text
    darkLight: '#E1E1E1', // Light gray for borders or surfaces
    gray: '#e3e3e3', // Gray for subtle backgrounds
    text: '#494949', // Primary text color
    textLight: '#7C7C7C', // Secondary text color
    textDark: '#1D1D1D', // Darker text for emphasis
    rose: '#ef4444', // Red for errors
    roseLight: '#f87171', // Lighter red for variations
  },
  fonts: {
    medium: '500',
    semibold: '600',
    bold: '700',
    extraBold: '800',
  },
  radius: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
  },
  // Added spacing for consistency
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray,
  },
  scrollContainer: {
    flexGrow: 1,
  },

  // Typography
  heading: {
    fontSize: 24,
    fontWeight: theme.fonts.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 18,
    fontWeight: theme.fonts.semibold,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  bodyText: {
    fontSize: 16,
    fontWeight: theme.fonts.medium,
    color: theme.colors.text,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: theme.fonts.medium,
    color: theme.colors.textLight,
  },

  // Buttons
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: theme.fonts.semibold,
  },
  secondaryButton: {
    backgroundColor: theme.colors.darkLight,
    borderWidth: 1,
    borderColor: theme.colors.gray,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.textLight,
    fontSize: 16,
    fontWeight: theme.fonts.semibold,
  },
  actionButton: {
    backgroundColor: theme.colors.primaryDark,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: theme.fonts.semibold,
  },
  disabledButton: {
    backgroundColor: theme.colors.textLight,
    opacity: 0.6,
  },

  // Forms
  input: {
    backgroundColor: theme.colors.darkLight,
    borderWidth: 1,
    borderColor: theme.colors.gray,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  // Cards
  card: {
    backgroundColor: theme.colors.darkLight,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },

  // Media
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.sm,
  },

  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textLight,
    marginTop: theme.spacing.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray,
    padding: theme.spacing.md,
  },
  errorText: {
    fontSize: 20,
    fontWeight: theme.fonts.bold,
    color: theme.colors.rose,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  footerLink: {
    fontSize: 14,
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },

  // Chat Specific
  chatMessage: {
    backgroundColor: theme.colors.darkLight,
    borderWidth: 1,
    borderColor: theme.colors.gray,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    marginVertical: theme.spacing.xs,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.darkLight,
    borderTopWidth: 1,
    borderColor: theme.colors.gray,
    padding: theme.spacing.sm,
  },
  chatInput: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },

  // File Upload
  uploadButton: {
    backgroundColor: theme.colors.darkLight,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: theme.fonts.semibold,
    color: theme.colors.primary,
  },
});

export default theme;