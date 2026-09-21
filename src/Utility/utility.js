import FileSaver from "file-saver";

const convertDate = (args) => {
  if (args) {
    const dt = args.split("T")[0];
    const date = new Date(dt).getUTCDate();
    const month = new Date(dt).getUTCMonth() + 1;
    const year = new Date(dt).getUTCFullYear();
    return `${date}-${month}-${year}`;
  } else {
    return "";
  }
};

const downloadImage = (path, imageName) => {
  // const link = document.createElement("a");
  // link.href = path;
  // link.target = "_blank";
  // link.download = imageName;
  // document.body.appendChild(link);
  // link.click();
  // document.body.removeChild(link);

  try {
    FileSaver.saveAs(path, imageName);
  } catch (err) {
    console.log(err);
  }
};

const downloadBase64Image = (base64Image, imageName) => {
  const link = document.createElement("a");
  link.href = base64Image;
  link.download = imageName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export { convertDate, downloadImage, downloadBase64Image };
