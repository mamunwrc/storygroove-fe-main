
const UploadProgressModal = ({
  uploadProgress,
  show,
  setShow,
  uploadMessage,
}) => {
  return (
    <>
      <div className="progressBarContainer">
        <p>{uploadMessage}</p>
        <progress id="file" value={uploadProgress} max="100" className="w-100">
          {`${uploadProgress}%`}{' '}
        </progress>
      </div>
    </>
  );
};

export default UploadProgressModal;
