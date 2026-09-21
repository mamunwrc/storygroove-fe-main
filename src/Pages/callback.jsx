import React, { useContext,useState, useEffect} from 'react';
import {NewAuthContext} from "../contexts/NewAuthProvider";

const Callback = ()=>{
        const { setTiktokToken } = useContext(NewAuthContext);
        const [message,setMessage] = useState("Processing request...");

        useEffect(()=>{
                const url = new URL(window.location.href);
                const token = url.searchParams.get('token');
                if(token){
                    setTiktokToken(token);
                    localStorage.setItem("tiktok",token);
                    window.close();
                }else{
                     setMessage("failed to validate your Tiktok account");
        
                }
        },[setTiktokToken])

      

        return (
                <h1>{message}</h1>
        );
}

export default Callback;