export const buildFeaturesArray = (subscription) => {
  if(!subscription) return [];

  return [
    {
      id: 1,
      label: 'Unlimited AI background removal',
    },
    {
      id: 2,
      label: `${subscription.aiPhotoBackgroundGenerations} AI Product Background generations per month`,
    },
    {
      id: 3,
      label: `${subscription.aiVideos} AI Video generations per month`,
    },
    {
      id: 4,
      label: 'Unlimited downloads, with no watermarks',
    },
  ];
};
