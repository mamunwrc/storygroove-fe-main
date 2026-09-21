import React, { createContext, useState, useEffect } from "react";

export const VideoContext = createContext();

const VideoContextProvider = ({children}) => {
    const localVideo = localStorage.getItem("video") ? JSON.parse(localStorage.getItem("video")) : null;
    const localVideoUrl = localStorage.getItem("videoUrl") ? JSON.parse(localStorage.getItem("videoUrl")) : null;
    const localCurVideo = localStorage.getItem("curVideo") ? JSON.parse(localStorage.getItem("curVideo")) : null;

    const [video,setVideo] = useState(localVideo);
    const [videoUrl,setVideoUrl] = useState(localVideoUrl);
    const [curVideo,setCurVideo] = useState(localCurVideo);

    useEffect(()=>{
        localStorage.setItem("video",JSON.stringify(video));
        localStorage.setItem("videoUrl",JSON.stringify(videoUrl));
        localStorage.setItem("curVideo",JSON.stringify(curVideo));
    },[video, videoUrl,curVideo]);

    return(
        <VideoContext.Provider value={{
            video,
            setVideo,
            videoUrl,
            setVideoUrl,
            curVideo,
            setCurVideo
            }}
        >
            {children}
        </VideoContext.Provider>
    ); 
}

export default VideoContextProvider;

