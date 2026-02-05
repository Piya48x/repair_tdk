// เปลี่ยนค่านี้เป็นความลับของคุณ ห้ามบอกใคร
const SECRET_SALT = "FACTORY_SECURE_KEY_2024"; 
const DOMAIN_SUFFIX = "@local.com";

export const formatCreds = (employeeId, pin) => {
  return {
    email: `${employeeId.trim().toUpperCase()}${DOMAIN_SUFFIX}`,
    password: `${pin}${SECRET_SALT}`
  };
};

export const getRealPin = (fullPassword) => {
    // ในทางปฏิบัติเราดึงกลับไม่ได้เพราะมัน Hash ไปแล้ว 
    // แต่ฟังก์ชันนี้เอาไว้เตือนความจำ Logic เฉยๆ
    return fullPassword.replace(SECRET_SALT, "");
};