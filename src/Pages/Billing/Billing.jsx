import React, { useEffect } from 'react';
import './billing.css';
import {
  Button,
  ButtonGroup,
  Dropdown,
  Pagination,
  Table,
} from 'react-bootstrap';
import { useState } from 'react';
import { getInvoice } from '../../api/billing';

const Billing = () => {
  const [pageCount, setPageCount] = useState(5);
  const [data, setData] = useState([]);
  const [totalPages, setTotalPages] = useState();
  const [activePage, setActivePage] = useState(1);

  const getData = async () => {
    const data = await getInvoice(pageCount, activePage);
    setTotalPages(data.data.pages);
    setData(data.data.invoices);
  };

  useEffect(() => {
    getData();
  }, [pageCount, activePage]);

  return (
    <>
      <div className="outerbillingdiv">
        <div className="innerbillingdiv">
          <h4 className="invoicetitle">Invoice List</h4>
        </div>
      </div>
      <div className="outerbillingdiv">
        <div className="innerbillingdiv">
          <p className="showp">Show</p>
          <Dropdown className="billingDropdown" as={ButtonGroup}>
            <Button variant="white">{pageCount}</Button>

            <Dropdown.Toggle
              className="ddtoggle"
              split
              variant="white"
              id="dropdown-split-basic"
            />

            <Dropdown.Menu>
              <Dropdown.Item onClick={() => setPageCount(5)}>5</Dropdown.Item>
              <Dropdown.Item onClick={() => setPageCount(10)}>10</Dropdown.Item>
              <Dropdown.Item onClick={() => setPageCount(15)}>15</Dropdown.Item>
              <Dropdown.Item onClick={() => setPageCount(20)}>20</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <p className="showp">Entries</p>
        </div>
      </div>
      <div className="outerbillingdiv">
        <div className="innerbillingdiv billing-table">
          <Table striped bordered hover>
            <thead>
              <tr>
                <td>#</td>
                <td>Date</td>
                <td>Name</td>
                <td>Email</td>
                <td>Amount</td>
                <td>Status</td>
                <td>Download</td>              
              </tr>
            </thead>
            <tbody>
              {data &&
                data.map((d, i) => (
                  <tr key={d.invoiceId}>
                    <td>{i + 1}</td>
                    <td>{
                       new Date(d.invoiceTimestamp).toLocaleDateString()
                    }</td>
                    <td>{d.customerName}</td>
                    <td>{d.customerEmail}</td>
                    <td>${d.invoiceAmount}</td>
                    <td>{d.status}</td>
                    <td>
                      <a href={d.downloadUrl}>download</a>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </Table>
        </div>
      </div>
      <div className="outerbillingdiv paginate">
        <div className="innerbillingdiv paginate-inner">
          <div>
            <p className="showp">
              Page {activePage} of {totalPages}, showing {pageCount} record(s)
              out of - total
            </p>
          </div>
          <Pagination className="billingpagination">
            <Pagination.Prev
              disabled={activePage == 1}
              onClick={() => setActivePage(activePage - 1)}
            >
              <span>&#8249;</span>&nbsp;Previous
            </Pagination.Prev>
            {totalPages &&
              [...Array(totalPages)].map((e, i) => (
                <Pagination.Item
                  key={i}
                  active={activePage == i + 1}
                  onClick={() => setActivePage(i + 1)}
                >
                  {i + 1}
                </Pagination.Item>
              ))}
            <Pagination.Next
              disabled={activePage == totalPages}
              onClick={() => setActivePage(activePage + 1)}
            >
              Next&nbsp;<span>&#8250;</span>
            </Pagination.Next>
          </Pagination>
        </div>
      </div>
    </>
  );
};

export default Billing;
