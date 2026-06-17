import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Img,
} from "@react-email/components";

interface BookingConfirmationEmailProps {
  customerName: string;
  serviceName: string;
  date: string;
  timeSlot: string;
  totalPaid: string;
  bookingId: string;
}

export const BookingConfirmationEmail = ({
  customerName,
  serviceName,
  date,
  timeSlot,
  totalPaid,
  bookingId,
}: BookingConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Your booking at RR Downtown Arcade is confirmed!</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={headerSection}>
          <Heading style={headerText}>RR DOWNTOWN ARCADE</Heading>
        </Section>
        
        {/* Main Content */}
        <Section style={contentSection}>
          <Heading style={h1}>Booking Confirmed! 🎮</Heading>
          <Text style={text}>Hi {customerName},</Text>
          <Text style={text}>
            Get ready for an epic time! Your booking is successfully confirmed. Here are your reservation details:
          </Text>
          
          {/* Details Box */}
          <Section style={detailsContainer}>
            <Text style={detailRow}>
              <span style={label}>Service:</span> <span style={value}>{serviceName}</span>
            </Text>
            <Hr style={hr} />
            <Text style={detailRow}>
              <span style={label}>Date:</span> <span style={value}>{date}</span>
            </Text>
            <Hr style={hr} />
            <Text style={detailRow}>
              <span style={label}>Time:</span> <span style={value}>{timeSlot}</span>
            </Text>
            <Hr style={hr} />
            <Text style={detailRow}>
              <span style={label}>Total Paid:</span> <span style={valueHighlight}>{totalPaid}</span>
            </Text>
          </Section>
          
          <Text style={bookingIdText}>
            Booking ID: <strong>{bookingId}</strong>
          </Text>
          
          <Text style={footerText}>
            Please arrive 10 minutes before your scheduled time. We look forward to seeing you at the arcade!
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#050505",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  padding: "40px 0",
};

const container = {
  backgroundColor: "#0a0a0a",
  margin: "0 auto",
  border: "1px solid #1f1f1f",
  borderRadius: "12px",
  overflow: "hidden",
  maxWidth: "600px",
  boxShadow: "0 0 20px rgba(59, 130, 246, 0.1)", // Subtle neon blue glow
};

const headerSection = {
  backgroundColor: "#111111",
  padding: "30px 0",
  textAlign: "center" as const,
  borderBottom: "2px solid #3b82f6", // Neon blue accent
};

const headerText = {
  color: "#ffffff",
  margin: "0",
  fontSize: "24px",
  fontWeight: "800",
  letterSpacing: "2px",
};

const contentSection = {
  padding: "40px 40px",
};

const h1 = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0 0 20px 0",
};

const text = {
  color: "#a1a1aa",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 20px 0",
};

const detailsContainer = {
  backgroundColor: "#121212",
  borderRadius: "8px",
  padding: "24px",
  border: "1px solid #27272a",
  margin: "30px 0",
};

const detailRow = {
  margin: "12px 0",
  fontSize: "16px",
};

const hr = {
  borderColor: "#27272a",
  margin: "12px 0",
};

const label = {
  color: "#71717a",
  display: "inline-block",
  width: "100px",
};

const value = {
  color: "#ffffff",
  fontWeight: "600",
};

const valueHighlight = {
  color: "#3b82f6", // Neon blue for price
  fontWeight: "bold",
};

const bookingIdText = {
  color: "#52525b",
  fontSize: "14px",
  textAlign: "center" as const,
  margin: "30px 0",
};

const footerText = {
  color: "#71717a",
  fontSize: "14px",
  lineHeight: "22px",
  textAlign: "center" as const,
  margin: "0",
};

export default BookingConfirmationEmail;
