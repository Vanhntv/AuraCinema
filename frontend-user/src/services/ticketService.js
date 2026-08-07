import axiosClient from "../api/axiosClient";

export const getMyTickets = async (params = {}) => {
  const response = await axiosClient.get("/tickets/my-tickets", { params });
  return response.data;
};

export const getMyTicketDetail = async (ticketId) => {
  const response = await axiosClient.get(`/tickets/${ticketId}`);
  return response.data;
};

export const getMyTicketQr = async (ticketId) => {
  const response = await axiosClient.get(`/tickets/${ticketId}/qr`);
  return response.data;
};
