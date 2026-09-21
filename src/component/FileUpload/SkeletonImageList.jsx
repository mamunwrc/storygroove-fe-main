import React, { useState, useEffect } from "react";
import { Skeleton } from "antd";
import "./skeletonImageList.scss";

const SkeletonImageList = ({
  // img src: StartingImage
  startingImage,

  // Int: Total expected images
  totalExpected,

  // Array of img src: what's currently loaded
  imageResults,

  // Int: Known failures
  failures,

  // Click handler
  onImageSelected,
}) => {
  const [loadingCount, setLoadingCount] = useState(totalExpected);

  useEffect(() => {
    // The number of images still loading is the total expected, minus results and failures
    setLoadingCount(totalExpected - ((imageResults?.length || 0) + failures));
  }, [totalExpected, imageResults, failures]);

  return (
    <div className="skeletonImageList-main">
      {/* First item is the original image */}
      <h6>Original</h6>
      <div className="skeletonImageList-block">
        <img
          className="skeletonImageList-image"
          src={startingImage}
          onClick={() => onImageSelected(startingImage)}
        />
      </div>

      <h6>Generations</h6>

      {/* Next, show all the results */}
      {imageResults && imageResults.map((src, _) => (
        <div className="skeletonImageList-block" key={`skeletonImage-${src}`}>
          <img
            className="skeletonImageList-image"
            src={src}
            onClick={() => onImageSelected(src)}
          />
        </div>
      ))}

      {/* Finally, show any remaining loads */}
      {Array.from({ length: loadingCount }).map((_, index) => (
        // Since we're just putting copies of a loading place-holder in, we'll use the index for the key
        <div className="skeletonImageList-block" key={`skeletonLoader-${index}`}>
          <Skeleton.Image
            active
            className="skeletonImageList-skeleton"
          />
        </div>
      ))}
    </div>
  );
};

export default SkeletonImageList;
