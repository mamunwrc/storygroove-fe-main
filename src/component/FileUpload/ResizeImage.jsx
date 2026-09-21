import { Resizable } from "re-resizable";
import React from "react";

export default function ResizeImage({ uploadImage }) {
  return (
    <div>
      <Resizable
        defaultSize={{
          width: 300,
        }}
        minWidth={100}
        // minHeight={100}
        maxHeight={400}
        style={{
          border: "1px solid #999999",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -8,
            left: -8,
            width: 20,
            height: 20,
            border: ".5px solid #999999",
            borderRadius: "50%",
            backgroundColor: "#ffffff",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            width: 20,
            height: 20,
            border: ".5px solid #837777",
            borderRadius: "50%",
            backgroundColor: "#ffffff",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -8,
            right: -8,
            width: 20,
            height: 20,
            border: ".5px solid #837777",
            borderRadius: "50%",
            backgroundColor: "#ffffff",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -8,
            left: -8,
            width: 20,
            height: 20,
            border: ".5px solid #837777",
            borderRadius: "50%",
            backgroundColor: "#ffffff",
          }}
        />
        <img
          src={uploadImage}
          alt="resizable"
          style={{ width: "100%", height: "auto", maxHeight: "400px" }}
        />
        {/* {selectedOptionForImage === null ? (
                                <img
                                  src={uploadImage}
                                  alt="resizable"
                                  style={{ width: "100%", height: "100%" }}
                                />
                              ) : (
                                <img
                                  src={uploadImage}
                                  alt="resizable"
                                  style={{ width: "100%", height: "100%" }}
                                />
                              )} */}
      </Resizable>
    </div>
  );
}
