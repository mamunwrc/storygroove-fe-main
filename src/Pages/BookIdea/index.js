import React, { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { createNewBook } from '../../api/bookGeneration';
import toast, { Toaster } from 'react-hot-toast';

const BookIdeaPage = () => {

    // State to manage form data
  const [formData, setFormData] = useState({
    name: '',
    bookIdea: ''
  });

// Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

  
          try {
            const response = await createNewBook(formData);            
           if(response.status === 200){
            toast.success(response.data.message);
            // Reset form
            setFormData({ name: '', bookIdea: ''});
           }
          
          
          } catch (err) {
            // if (err.response.status === 401) {
            //   setShowToster(true);
            //   const errorMessage = err.response.data.message;
            //   setErrorToastMessage(errorMessage);
            // } else {
            //   const errorMessage = err.response.data.message;
            //   setErrorToastMessage(errorMessage);
            //   setShowToster(true);
            toast.error(err.message);
            
            }
  };

    return (
        <div className='content-container mt-5'>
            
        <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="formName">
          <Form.Label>Name</Form.Label>
          <Form.Control
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your name"
            required
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formBookIdea">
          <Form.Label>Book Idea</Form.Label>
          <Form.Control
            as="textarea"
            name="bookIdea"
            value={formData.bookIdea}
            onChange={handleChange}
            rows={4}
            placeholder="Describe your book idea"
            required
          />
        </Form.Group>

        <Button variant="primary" type="submit">
          Submit
        </Button>
      </Form>

 <Toaster position="top-right" />
        </div>
    );
};

export default BookIdeaPage;