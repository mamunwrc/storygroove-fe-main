import { useCallback, useContext } from 'react';
import { Form } from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';
import { uploadFile } from '../../api/images';
import './fileuploadStyles.scss';
import clsx from 'clsx';
import { useUI } from '../../contexts/ManagedUIContext';
import { ImageContext } from '../../contexts/imageContext';
import { toast } from 'react-toastify';

const FileUpload = ({
  originalImage,
  setOriginalImage,
  setUploadProgress,
  setShow,
  setUploadMessage,
  setImageChanged = '',
  setError = '',
}) => {
  const { setOpenModal } = useUI();

  useContext(ImageContext);

  // Object.entries(acceptedFiles).forEach(([key, value]) => {
  //   console.log(`${key}: ${value}`);
  // });
  // console.log("file is " + acceptedFiles);

  // const onDrop = useCallback((acceptedFiles) => {
  //   localStorage.removeItem("shopify_product_id");
  //   localStorage.removeItem("shopify_image_description");

  //   // Do something with the files
  //   acceptedFiles.forEach((file) => {
  //     if (file) {
  //       const formData = new FormData();
  //       formData.append("image", file);
  //       // this can be ignored, added to differentiate between product and background
  //       // images , might be useful in future
  //       formData.append("type", "product");
  //       console.log(formData);
  //       setShow(true);
  //       setUploadMessage("Uploading Image");
  //       uploadFile(formData, uploadProgressCallback)
  //         .then((res) => {
  //           if (res?.status == "failed") {
  //             setShow(false);
  //             setError != "" && setError(res.message);
  //             return;
  //           }
  //           setShow(false);
  //           setImageChanged != "" && setImageChanged(true);
  //           setOriginalImage(res.image);
  //         })
  //         .catch((err) => {
  //           setShow(false);
  //           // setError(err);
  //           console.log(err);
  //         });
  //     }
  //   });
  // }, []);

  const onDrop = useCallback((acceptedFiles) => {
    localStorage.removeItem('shopify_product_id');
    localStorage.removeItem('shopify_image_description');

    setShow(true);
    setUploadMessage('Uploading Images');

    uploadFile(acceptedFiles, uploadProgressCallback) // Now we're uploading all files at once
      .then((responses) => {
        setShow(false);
        setImageChanged(true);
        setOriginalImage(responses.images);

        // You may want to handle responses here
      })
      .catch((err) => {
        setShow(false);
        console.error(err);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- uploadProgressCallback defined below; stable setters omitted to avoid unnecessary churn
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpeg'],
      'image/jpg': ['.jpg'],
      'image/webp': ['.webp'],
    },
    multiple: true, // This will allow multiple files to be selected/dragged at once
  });

  const uploadProgressCallback = (progressEvent) => {
    if (progressEvent % 5 === 0) {
      setUploadProgress(progressEvent);
    }
  };

  return (
    <>
      <div
        className={clsx(
          originalImage != null
            ? 'after-upload flex-row gap-4 ok'
            : 'flex-row gap-0',
          'upload-image-section d-flex align-items-center justify-content-center mt-lg-5 mt-0 flex-wrap flex-lg-nowrap ok'
        )}
      >
        <div className="text">
          <p>or Drag and Drop images here</p>
        </div>
        {/* upload image  */}
        <div className="upload-container " {...getRootProps()}>
          <div className="upload-box1 w-100">
            <Form
              method="post"
              action=""
              encType="multipart/form-data"
              about="fileUpload"
            >
              <input
                type="file"
                className="upload-file-input"
                id="fileUpload"
                {...getInputProps()}
              />
              <input
                type="button"
                value={clsx(
                  originalImage != null
                    ? 'Upload A New Image'
                    : 'Upload Image From Device'
                )}
                className="upload-button"
              />
              <br />
              {/* <span>or drag and drop images</span> */}
            </Form>
          </div>
        </div>

        <div className="upload-container-or">
          <div className="upload-box-or">or</div>
        </div>

        {/* upload image with shopify */}
        <div className="upload-container">
          <div className="upload-box w-100">
            <button
              type="button"
              onClick={() => {
                const signupType = localStorage?.getItem('signupType');
                if (signupType === 'shopify') {
                  setOpenModal({
                    view: 'SHOPIFY_PRODUCT',
                    isOpen: true,
                    data: {
                      title: 'Select a product to proceed..',
                    },
                  });
                } else {
                  toast.error(
                    'You need to login with shopify to access this feature'
                  );
                }
              }}
              className="upload-button upload-button-shopify-secondary"
            >
              <img src="/assets/images/shopify.png" alt="" />
              Use From Shopify store
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FileUpload;
