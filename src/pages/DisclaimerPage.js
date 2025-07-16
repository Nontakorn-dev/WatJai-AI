// src/pages/DisclaimerPage.js
import React, { useState, useEffect } from 'react';
import { Container, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaLanguage } from 'react-icons/fa';

const disclaimerContent = {
  th: {
    title: 'ข้อตกลงในการใช้ซอฟต์แวร์',
    text: 'ซอฟต์แวร์นี้เป็นผลงานที่พัฒนาขึ้นโดย นายจิรายุ เจริญไทย, นายทัตเทพ รัตนบุรี และนายนนทกร  ภู่หลักแก้ว จาก โรงเรียนอยุธยาวิทยาลัย ภายใต้การดูแลของ นายเกรียงศักดิ์ นิลประสิทธิ์ ภายใต้โครงการ WatJai : แพลตฟอร์มสำหรับการคัดกรองโรคหัวใจจากการตรวจกราฟคลื่นไฟฟ้าหัวใจด้วย Deep Learning  ซึ่งสนับสนุนโดย สำนักงานพัฒนาวิทยาศาสตร์และเทคโนโลยีแห่งชาติ โดยมีวัตถุประสงค์เพื่อส่งเสริมให้นักเรียนและนักศึกษาได้เรียนรู้และฝึกทักษะในการพัฒนาซอฟต์แวร์ ลิขสิทธิ์ของซอฟต์แวร์นี้จึงเป็นของผู้พัฒนา ซึ่งผู้พัฒนาได้อนุญาตให้สำนักงานพัฒนาวิทยาศาสตร์และเทคโนโลยีแห่งชาติ เผยแพร่ซอฟต์แวร์นี้ตาม “ต้นฉบับ” โดยไม่มีการแก้ไขดัดแปลงใดๆ ทั้งสิ้น ให้แก่บุคคลทั่วไปได้ใช้เพื่อประโยชน์ส่วนบุคคลหรือประโยชน์ทางการศึกษาที่ไม่มีวัตถุประสงค์ในเชิงพาณิชย์ โดยไม่คิดค่าตอบแทนการใช้ซอฟต์แวร์ ดังนั้น สำนักงานพัฒนาวิทยาศาสตร์และเทคโนโลยีแห่งชาติ จึงไม่มีหน้าที่ในการดูแล บำรุงรักษา จัดการอบรมการใช้งาน หรือพัฒนาประสิทธิภาพซอฟต์แวร์รวมทั้ง ไม่รับรองความถูกต้องหรือประสิทธิภาพการทำงานของซอฟต์แวร์ ตลอดจนไม่รับประกันความเสียหายต่าง ๆ อันเกิดจากการใช้ซอฟต์แวร์นี้ทั้งสิ้น',
    button: 'Switch to English'
  },
  en: {
    title: 'Software License and Disclaimer',
    text: 'This software is a work developed by Mr. Jirayu Charoenthai, Mr. Thatthep Rattanaburi and Mr. Nontakorn Pulakkeaw from Ayutthaya Wittayalai School under the provision of Mr. Kriangsak Nilprasit under WatJai: A platform for heart disease screening using ECG analysis by Deep Learning, which has been supported by the National Science and Technology Development Agency (NSTDA), in order to encourage pupils and students to learn and practice their skills in developing software. Therefore, the intellectual property of this software shall belong to the developer and the developer gives NSTDA a permission to distribute this software as an “as is” and non-modified software for a temporary and non-exclusive use without remuneration to anyone for his or her own purpose or academic purpose, which are not commercial purposes. In this connection, NSTDA shall not be responsible to the user for taking care, maintaining, training, or developing the efficiency of this software. Moreover, NSTDA shall not be liable for any error, software efficiency and damages in connection with or arising out of the use of the software.”',
    button: 'เปลี่ยนเป็นภาษาไทย'
  }
};

const DisclaimerPage = () => {
  const [language, setLanguage] = useState('th');

  const handleSwitchLanguage = () => {
    setLanguage(prevLang => (prevLang === 'th' ? 'en' : 'th'));
  };

  // ใช้ useEffect เพื่อจัดการสีพื้นหลังของ body
  useEffect(() => {
    document.body.style.backgroundColor = '#f8f9fa'; // สีพื้นหลังหลักของ WatJai
    // คืนค่าสีพื้นหลังเดิมเมื่อออกจากหน้านี้
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []); // [] หมายถึงให้ Effect นี้ทำงานแค่ครั้งเดียวตอนเปิดหน้า

  const content = disclaimerContent[language];

  return (
    <Container className="my-4 my-lg-5">
        <div className="d-flex justify-content-start mb-4">
            <Link to="/" className="btn btn-light rounded-pill shadow-sm">
                <FaArrowLeft className="me-2" />
                กลับหน้าหลัก
            </Link>
        </div>

        <Card className="border-0 shadow-sm" style={{ borderRadius: '16px' }}>
          <Card.Header as="h2" className="text-center bg-white border-0 pt-4 pb-3">
            {content.title}
          </Card.Header>
          <Card.Body className="px-4 pb-4">
            <p style={{ textAlign: 'justify', lineHeight: 1.7, color: '#555' }}>
              {content.text}
            </p>
            <hr className="my-4" />
            <div className="text-center">
              <Button variant="outline-primary" onClick={handleSwitchLanguage} className="rounded-pill px-4">
                <FaLanguage className="me-2" />
                {content.button}
              </Button>
            </div>
          </Card.Body>
        </Card>
    </Container>
  );
};

export default DisclaimerPage;