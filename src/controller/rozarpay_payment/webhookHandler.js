import crypto from 'crypto';

const webhookHandler = (req, res) => {
  try {
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET);
    shasum.update(req.body); // raw buffer chahiye
    const digest = shasum.digest('hex');

    const signature = req.headers['x-razorpay-signature'];

    if (digest !== signature) {
      console.log('Webhook signature mismatch');
      return res.status(400).json({ success: false });
    }

    const event = JSON.parse(req.body);
    console.log('Webhook event:', event.event);

    if (event.event === 'payment.captured') {
      // TODO: DB update — mark paid using event.payload.payment.entity.order_id
    }

    if (event.event === 'payment.failed') {
      // TODO: DB update — mark failed
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ success: false });
  }
};

export default webhookHandler;