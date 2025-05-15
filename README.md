![image](https://github.com/user-attachments/assets/d2f6db68-357a-4931-9791-ae50e4b405bb)

**Repaye✨**

An application to deliver verifiable reviews and ratings based on on-chain user behavior and transactions.
________________________________________________________________________________________________________

**Problem Statement❔**
1. Reviews on major platforms such as Google Reviews and Instagram often lack authenticity.
 Users may be influenced by platform algorithms that prioritize certain content, leading to biased visibility. Moreover, some individuals or businesses go as far as purchasing followers or 
 engagement to manipulate public perception, thereby compromising the reliability and integrity of user-generated reviews.

2. Shoppers deliberately remove negative reviews and retain only those that portray them in a favorable light. 
 This selective curation of feedback is often done to maintain a positive public image and influence potential customers. By showcasing only beneficial reviews, they create a misleading 
 representation of their products or services. This manipulation not only distorts consumer trust and decision-making but also artificially inflates overall ratings, giving an inaccurate 
 impression of quality and customer satisfaction.
_______________________________________________________________________________________________________

**Solution💥**

![image](https://github.com/user-attachments/assets/f68c6027-4588-4eae-ad4e-1a625bb4ff54)

We formulated an algorithm to enhance the accuracy of rating analysis and filtering with the objective of identifying the most reliable and high-performing establishments.
The data utilized in this algorithm are stored on-chain, ensuring transparency, immutability and secure access for all relevant computations and analyses.

1. Food preference :

   Analyze food preferences of user by examining their transaction history, as their purchasing patterns provide valuable insights into their dietary habits and preferred cuisines.

2. Visiting frequency :

   Users with higher visiting frequency are considered to provide more reliable and trustworthy reviews, as their feedback is based on consistent and repeated experiences.
   
3. Service Performance :
   
   Customers also take the quality of service into account. Even if the food is excellent, impolite or unprofessional behavior from the staff can negatively impact the overall dining               experience,potentially discouraging users from returning in the future.
   
4. Spending amount :
   
    Customers who spend larger amounts at a store typically have greater experience with its offerings, which enables them to provide more informed and credible ratings. Their higher level of 
    engagement suggests a deeper understanding of the product or service quality, making their feedback particularly valuable for accurately assessing the establishment.
   
5.  Confidence level :
   
    The confidence level reflects the complexity and authenticity of the comments provided by users. For example, if a user repeatedly posts simplistic or redundant remarks such as "nice, nice, 
    nice," the algorithm, through AI analysis, will identify and filter out such repetitive content. This ensures that only meaningful and substantive feedback contributes to the overall 
    evaluation, thereby enhancing the reliability and accuracy of the ratings.

_________________________________________________________________________________________________________
**HOW OUR PROJECT WORKS🍴**

Users start by selecting the date and time to book a restaurant reservation. Then they will choose the dishes they wish to order and proceed with the payment. Only after completing the payment can users submit reviews and ratings. Additionally, users are allowed to submit a rating only once per day to ensure fairness and preventing multiple reviews within the same day.




__________________________________________________________________________________________________________
**ARCHITECTURE DIAGRAM**
![image](https://github.com/user-attachments/assets/844a58d5-6c61-4551-9107-16d6af73a9db)

1. The User Interface developed using TypeScript (Frontend)

   It provides an intuitive and interactive experience for users to:

   Select the desired date and time for restaurant reservations, browse and select dishes from the menu,complete the payment process securely,submit reviews and ratings after the transaction is    confirmed and connect a wallet for authentication and payment purposes.

2. Blockchain Layer + APIs (Backend)

   The backend is composed of several interconnected components that manage data storage, verification and logic execution:


    a. Blockchain Layer
   
    This component stores user activities, payments, bookings and reviews on a decentralized blockchain. It ensures immutability, transparency, and security of data, fostering user trust by         preventing tampering or manipulation.

   b. Helius API

    The Helius API facilitates real-time communication with the blockchain.It enables the application to fetch on-chain data such as transaction status, payment verification and wallet              interactions. Helius simplifies complex blockchain queries, making backend operations more efficient and scalable.

   c. OpenAI Integration

    OpenAI’s language models are used to process and analyze user-generated reviews. The AI model evaluates review sentiment, detects redundant or repetitive content and measures comment            complexity. This ensures that only genuine and insightful reviews influence the restaurant rating, while generic or spam-like feedback is filtered appropriately.

 3. Wallet Connection (Solana Wallet)
    The platform integrates a Solana-compatible wallet to handle user authentication and payment.
    Users are required to connect their wallets to: Verify their identity, confirm payments before being allowed to review and ensure they can only submit one rating per day. This system            enforces fair usage, prevents review abuse, and enhances security.

________________________________________________________________________________________________________
**Why on SOLANA?**

![image](https://github.com/user-attachments/assets/ea4d494e-7df7-4331-ba36-8d7d62881d22)


1. On-Chain Transparency and Review Authenticity

   By storing reviews and ratings on-chain, Solana ensures tamper-proof review records—once submitted, reviews cannot be edited or deleted, transparent histories of user interactions and           spending, enhanced trustworthiness in ratings due to immutable and verifiable data. This combats fake or manipulated reviews common in centralized systems.

2. Low Transaction Costs
      
   Each transaction on Solana typically costs fractions of a cent, which is critical for our platform where frequent micro-interactions occur, such as dish selection and modification, payments,
   review submissions.This ensures the platform remains affordable and sustainable, even at scale.

3. High Transaction Speed

   Solana is capable of handling 65,000+ transactions per second (TPS), which is essential for a system where multiple users may book restaurant slots simultaneously,complete payments instantly    and submit reviews in real time.


________________________________________________________________________________________________________
**Business Model 💰** 

1. Sponsored Listings and Ads:

   The platform can incorporate a variety of advertising formats, including banner advertisements, video promotions and seasonal campaigns. Meanwhile, the platform will not only creates an         additional source of revenue but also supports restaurants in strengthening their brand visibility and attracting a larger customer base.


2. Six-Month Complimentary Transaction Fee Period for Each Store:

   To encourage new stores to join and actively use the platform, a complimentary transaction fee waiver will be offered for the first six months following their registration. During this          introductory period, stores can fully utilize the platform’s services without incurring any transaction fees, allowing them to experience the benefits and increase their customer engagement     risk-free. After the completion of this six-month grace period, stores will be subject to a transaction fee applied to each completed sale. This fee will range from 5% to 10%, depending on      factors such as the store’s sales volume.




